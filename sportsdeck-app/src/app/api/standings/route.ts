

// Check if <season> standings exist
// If they dont exist or cache is not recent enough, get it from the API. Put info into the database
// Get standings from database

import { Standing } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @openapi
 * /api/standings:
 *   get:
 *     summary: Get Premier League standings for a season
 *     tags: [Standings]
 *     parameters:
 *       - in: query
 *         name: season
 *         schema:
 *           type: string
 *         example: "2024"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TOTAL, HOME, AWAY]
 *         example: "TOTAL"
 *     responses:
 *       200:
 *         description: Ordered list of standings with team info
 *       400:
 *         description: Invalid type parameter or invalid season year
 *       500:
 *         description: Internal server error (API key missing)
 */
export async function GET(req: Request){
    const apiKey = process.env.X_AUTH_TOKEN;

    if (!apiKey){
        return NextResponse.json({message: "Internal Server Error: API key not found."}, {status: 500});
    }

    // Set up season and URL
    const {searchParams} = new URL(req.url);
    let season = searchParams.get("season");
    const type = searchParams.get("type") ?? "TOTAL";

    if (type !== "TOTAL" && type !== "HOME" && type !== "AWAY"){
        return NextResponse.json({message: "Invalid type parameter. Provide TOTAL, HOME, or AWAY."}, {status: 400});
    }

    let football_api_url = "https://api.football-data.org/v4/competitions/PL/standings"

    // User sanitization
    if (!season){
        season = String(new Date().getFullYear() - 1);
    }
    const seasonYear = parseInt(season)
    if (isNaN(seasonYear) || seasonYear < 1992 || seasonYear > new Date().getFullYear() - 1){
        return NextResponse.json({message: "Invalid season"}, {status: 400});
    }
    
    football_api_url += `?season=${season}`;

    // Get standings. Might return this
    let season_standings = await prisma.standing.findMany({
        where: {season: season, type: type},
        include: { team: true },
        orderBy: { position: "asc" }
    })

    //Check staleness
    const is_stale = (standing: Standing) => {
        const time_difference = Date.now() - standing.cachedAt.getTime(); // Miliseconds
        return time_difference > 60 * 60 * 1000;
    }
    const stale = season_standings.length === 0 || season_standings.some((standing: Standing) => is_stale(standing));

    // Just return the standings if they are not stale
    if (!stale){
        return NextResponse.json({standings: season_standings}, {status: 200});
    }

    try{
        // Fetch from the API 
        const response = await fetch(
            football_api_url, 
            {
                headers: {
                    "X-Auth-Token": apiKey
                },
            }
        );
        if (!response.ok){
            return NextResponse.json({standings: season_standings}, {status: 200});
        }

        // The user can pick either TOTAL, HOME, or AWAY
        const response_standings = (await response.json())["standings"].find((s: { type: string | null; }) => s.type === type)["table"];

        // Update database
        await Promise.all(response_standings.map((standing: { team: { id: any; }; position: any; playedGames: any; won: any; draw: any; lost: any; goalsFor: any; goalsAgainst: any; points: any; }) => {
            return prisma.standing.upsert({
                where: {
                    externalTeamId_season_type: {
                        externalTeamId: String(standing.team.id),
                        season: String(season),
                        type: type
                    }
                },
                update: {
                    position: standing.position,
                    played: standing.playedGames,
                    won: standing.won,
                    drawn: standing.draw,
                    lost: standing.lost,
                    goalsFor: standing.goalsFor,
                    goalsAgainst: standing.goalsAgainst,
                    points: standing.points,
                    cachedAt: new Date(),
                    type: type
                },
                create: {
                    team: {connect: {externalId: String(standing.team.id)}},
                    externalTeamId: String(standing.team.id),
                    season: String(season),
                    position: standing.position,
                    played: standing.playedGames,
                    won: standing.won,
                    drawn: standing.draw,
                    lost: standing.lost,
                    goalsFor: standing.goalsFor,
                    goalsAgainst: standing.goalsAgainst,
                    points: standing.points,
                    cachedAt: new Date(),
                    type: type    
                }
            })
        }));

        // Return standings
        const updated_season_standings = await prisma.standing.findMany({
            where: {season: season, type: type},
            include: { team: true },
            orderBy: { position: "asc" }
        })
        
        return NextResponse.json({standings: updated_season_standings}, {status: 200});
    }
    catch (e){
        console.error("Failed to parse API response or upsert standings:", e)
        return NextResponse.json({ standings: season_standings }, { status: 200 });
    }
}