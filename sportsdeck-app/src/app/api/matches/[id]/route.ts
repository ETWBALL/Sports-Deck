
import { Match } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * @openapi
 * /api/matches/{id}:
 *   get:
 *     summary: Get a single match by database ID, refreshing stale data from the external API
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxmatch001"
 *     responses:
 *       200:
 *         description: Match details with home and away team info
 *       404:
 *         description: Match not found
 *       500:
 *         description: Internal server error
 */
//Check for that match [id] in the database
// if stale fetch from API
// Store again in database
// fetch from database

export async function GET(req: Request, { params }: { params: { id: string } }){

    // Assert api key exists otherwise a type error will occur
    const apiKey = process.env.X_AUTH_TOKEN;
    if (!apiKey){
        return NextResponse.json({message: "Internal Server Error"}, {status: 500});
    }

    const {id} = await params;

    // Find match
    var match = await prisma.match.findUnique({
        where: {id: id},
        include: { homeTeam: true, awayTeam: true }

    })

    // Tell user not to provide externalid
    if (!match){
        return NextResponse.json({message: "Match not found. Please provide <id>, not <externalId>."}, {status: 404});
    }

    //Check if match is stale
    const check_stale = (match: Match) => {
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

    const stale = check_stale(match);

    if (!stale){
        return NextResponse.json({match: match}, {status: 200});
    }

    const api_route = `https://api.football-data.org/v4/matches/${match.externalId}`;

    // At this point, assume the uer put the right info. Just fetch data. 
    const response = await fetch(
        api_route, 
        {
            headers: {
                "X-Auth-Token": apiKey
            },
        }
    );

    if (!response.ok){
        console.error(`API Fetch failed for match ${id}`);
        // Dont break the server, just return stale data
        return NextResponse.json({match: match}, {status: 200});

    }

    try{    
        // Put new information into the database
        const response_match = await response.json();
        await prisma.match.upsert({
            where: {id: match.id},
            update: {
                awayTeam: { connect: { externalId: String(response_match.awayTeam.id) } },
                homeTeam: { connect: { externalId: String(response_match.homeTeam.id) } },
                venue: response_match.venue,
                status: response_match.status,
                homeScore: parseInt(response_match.score.fullTime.home) ?? null,
                awayScore: parseInt(response_match.score.fullTime.away) ?? null,
                matchDate: new Date(response_match.utcDate),
                cachedAt: new Date(),
                matchday: parseInt(response_match.matchday) ?? null,
                season: "2025-2026",
                stage: response_match.stage
            },
            create: {
                externalId: response_match.id,
                awayTeam: { connect: { externalId: String(response_match.awayTeam.id) } },
                homeTeam: { connect: { externalId: String(response_match.homeTeam.id) } },
                venue: response_match.venue,
                status: response_match.status,
                homeScore: parseInt(response_match.score.fullTime.home) ?? null,
                awayScore: parseInt(response_match.score.fullTime.away) ?? null,
                matchDate: new Date(response_match.utcDate),
                cachedAt: new Date(),
                matchday: parseInt(response_match.matchday ?? null),
                season: "2025-2026",
                stage: response_match.stage
            }
        })


        match = await prisma.match.findUnique({
            where: {id: id},
            include: { homeTeam: true, awayTeam: true }
        })

        return NextResponse.json({match: match}, {status: 200});
    }
    catch(e){
        console.error(`Failed to parse or upsert match ${id}:`, e)
        return NextResponse.json({ match: match }, { status: 200 });
    }
}