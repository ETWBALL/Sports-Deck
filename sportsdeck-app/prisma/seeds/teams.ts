    // First check if we are allowed to run this seed (definitely not in production)
    // Calll the api for teams
    // Put in database
    // Print a message

import { PrismaClient, Prisma } from "@/generated/prisma";
import { DefaultArgs } from "@/generated/prisma/runtime/library";
import { prisma } from "../../src/lib/prisma"

export async function main(prisma: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>){
    if (process.env.NODE_ENV === "production"){
        throw new Error("Can not run this seed during production!")
    }
    
    // Get the teams
    const apiKey = process.env.X_AUTH_TOKEN;
    if (!apiKey) throw new Error("Missing X_AUTH_TOKEN");

    const seasons = [2025];
    for (const season of seasons){
        const api_route = `https://api.football-data.org/v4/competitions/PL/teams?season=${String(season)}`;
        let response = await fetch(
            api_route, 
            {
                headers: {
                    "X-Auth-Token": apiKey
                },
            }
        );

        if (!response.ok) {
            console.error(`Failed for season ${season}: ${response.status} ${response.statusText}`)
            const body = await response.text()
            console.error("Response body:", body)
            throw new Error("Failed to fetch teams. API failed")
        }

        const data = await response.json();
        const teams = data["teams"];

        //Populate database
        await Promise.all(teams.map((team:any) =>
            prisma.team.upsert({
                where: {externalId: String(team.id)},
                update: {
                    name: team.name,
                    shortName: team.tla,
                    logoUrl: team.crest,
                    venue: team.venue ?? "",
                    cachedAt: new Date()
                },
                create: {
                    externalId: String(team.id),
                    name: team.name,
                    shortName: team.tla,
                    logoUrl: team.crest,
                    venue: team.venue ?? "",
                    cachedAt: new Date()
                }
            })
        ))
    }
    console.log("Teams added!!!");
    return await prisma.team.findMany();
}
