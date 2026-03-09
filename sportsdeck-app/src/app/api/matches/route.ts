import { Match } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @openapi
 * /api/matches:
 *   get:
 *     summary: Get Premier League matches by matchday or date range
 *     tags: [Matches]
 *     parameters:
 *       - in: query
 *         name: matchday
 *         schema:
 *           type: integer
 *         example: 20
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-03-01"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-03-07"
 *     responses:
 *       200:
 *         description: List of matches with team info
 *       400:
 *         description: Invalid or missing matchday/date range parameters
 *       500:
 *         description: Internal server error
 */

interface API_Match{
    id: number,
    utcDate: string, 
    status: string, 
    homeTeam: {id: number, name: string, tla: string, crest: string, venue: string},
    awayTeam: {id: number, name: string, tla: string, crest: string, venue: string},
    matchday: number,
    venue: string,
    score: {winner: string, fullTime: {home: number | null, away: number | null}}
    season: {startDate: string, endDate: string},
    stage: string
}

async function upsert_match(match: API_Match){
    return await prisma.match.upsert({
        where: {externalId: String(match.id)},
        update: {
            status: match.status,
            venue: match.venue ?? "",
            homeScore: match.score.fullTime.home,
            awayScore: match.score.fullTime.away,
            matchDate: new Date(match.utcDate),
            cachedAt: new Date()
        },
        create: {
            externalId: String(match.id),
            venue: match.venue ?? "",
            status: match.status,
            homeScore: match.score.fullTime.home,
            awayScore: match.score.fullTime.away,
            cachedAt: new Date(),
            matchDate: new Date(match.utcDate),
            homeTeam: {connect: {externalId: String(match.homeTeam.id)}}, 
            awayTeam: {connect: {externalId: String(match.awayTeam.id)}}, 
            matchday: match.matchday,
            season: `${new Date(match.season.startDate).getFullYear()}-${new Date(match.season.endDate).getFullYear()}`,
            stage: match.stage
        }
    })
}



export async function GET(req: Request){
    // Assert api key exists otherwise a type error will occur
    const apiKey = process.env.X_AUTH_TOKEN;

    if (!apiKey){
        return NextResponse.json({message: "Internal Server Error"}, {status: 500});
    }

    // Get the date range. Ensure that they exist before moving on
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const matchday = searchParams.get("matchday");
    let  api_route = "https://api.football-data.org/v4/competitions/PL/matches";


    if ((matchday && dateFrom && dateTo) || (!matchday && !dateFrom && !dateTo)){
        return NextResponse.json({message: "Please provide either (1) matchday or (2) a date range."}, {status: 400});
    }

    let where;

    if (matchday){
        api_route += "?matchday=" + matchday;
        where = {matchday: parseInt(matchday)};
    }
    else {
        if (isNaN(new Date(dateFrom || "").getTime()) || isNaN(new Date(dateTo || "").getTime())) {
            return NextResponse.json({ message: "Invalid date format" }, { status: 400 });
        }
        api_route += "?dateFrom=" + dateFrom + "&dateTo=" + dateTo;

        where = {
            matchDate: {
                gte: new Date(dateFrom!),
                lte: new Date(dateTo!)
            }
        }
    }

    // Make a call to the database
    let matches = await prisma.match.findMany({
        where: where,
        orderBy: {matchDate: "asc"},
        include: {
            homeTeam: true,
            awayTeam: true,
        }
    })

    // Check if there are any matches in that range AND if there is atleast one stale
    const check_freshness = (match: Match) => {
        // Get the time difference
        const time_difference = Date.now() - match.cachedAt.getTime();

        // Finished games should not be refreshed
        if (match.status === "FINISHED"){
            return false;
        }

        // If the game is live, check for a live refresh (1 min in this case)
        if (match.status === "IN_PLAY" || match.status === "PAUSED"){
            return time_difference > 60_000;
        }

        // if any other status, it can be updated after 10 mins
        return time_difference > 10*60_000;
    }

    const is_stale = matches.length === 0 || matches.some(match => check_freshness(match));

    // If the matches are fresh, return them
    if (!is_stale ){
        return NextResponse.json({matches: matches}, {status: 200});
    }


    // At this point, assume the uer put the right info. Just fetch data. If the same url is hit, cache the result
    const response = await fetch(
        api_route, 
        {
            headers: {
                "X-Auth-Token": apiKey
            },
        }
    );

    if (!response.ok){
        console.error(`API Fetch failed for matches`);
        // Dont break the server, just return stale data
        return NextResponse.json({matches: matches}, {status: 200});
    }

    try{
        // Update all database tables in that date range and return that
        const matches_api = (await response.json())["matches"];
        await Promise.all(matches_api.map((match: API_Match) => upsert_match(match)));

        // Make another call to database
        matches = await prisma.match.findMany({
        where: where,
        orderBy: { matchDate: "asc" },
        include: { homeTeam: true, awayTeam: true }
        })

        return NextResponse.json({matches: matches}, {status: 200});
    }
    catch(e){
        console.error("Failed to parse or upsert matches:", e)
        return NextResponse.json({ matches: matches }, { status: 200 });
    }
}