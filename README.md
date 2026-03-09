# SportsDeck 🏆

SportsDeck is a modern web application built for sports fans. It centralizes the sports fanbase into a single platform dedicated to the **Premier League**, offering real-time match data, live standings, community discussion forums, polls, moderation tools, AI-powered features, and a personalized activity feed — all in one place.

---

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Database:** SQLite via Prisma ORM
- **Auth:** JWT (access + refresh tokens)
- **External APIs:** football-data.org (match data, standings, teams)
- **AI:** Hugging Face Inference API (sentiment analysis, moderation, daily digest)
- **Styling:** TailwindCSS

---

## Project Structure

```
309 Project Repo/
├── sportsdeck-app/       # Next.js application
│   ├── prisma/           # Schema, migrations, and seed scripts
│   ├── src/
│   │   ├── app/api/      # REST API route handlers
│   │   ├── lib/          # Prisma client, auth utilities, AI helpers
│   │   └── generated/    # Prisma generated client
│   └── .env              # Environment variables
├── startup.sh            # First-time setup script
├── run.sh                # Start the server
├── postman_collection.json
├── collection.openapi
└── docs.pdf
```

---

## Prerequisites

Make sure you have the following installed on your machine:

- **Node.js** v20+
- **SQLite3**
- **npm**

---

## Environment Variables

The `.env` file is located inside `sportsdeck-app/`. It should contain:

```env
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=30d
SALT_ROUNDS=10
X_AUTH_TOKEN=your_football_data_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

> The `.env` file is committed to the repository for ease of setup during interviews.

---

## Setup (First Time)

Run the startup script from the **root of the repository**:

```bash
chmod +x startup.sh
./startup.sh
```

This will:
1. Install all npm dependencies
2. Generate the Prisma client
3. Run all database migrations (creates `dev.db`)
4. Seed the database with users, teams, matches, threads, posts, polls, and follows

The seed script also fetches the **Premier League teams** from the football-data.org API and stores them in the database.

---

## Running the Server

After setup, start the server with:

```bash
chmod +x run.sh
./run.sh
```

The server will be available at:

```
http://localhost:3000
```

---

## API Overview

All APIs are RESTful and accessible under `/api/`. Key endpoint groups:

| Group | Base Path |
|---|---|
| Auth | `/api/auth/` |
| Matches | `/api/matches/` |
| Standings | `/api/standings/` |
| Teams | `/api/teams/` |
| Threads | `/api/threads/` |
| Posts & Replies | `/api/posts/` |
| Polls | `/api/polls/` |
| Users & Profiles | `/api/users/` |
| Moderation | `/api/moderation/` |
| Feed | `/api/feed/` |
| Daily Digest | `/api/digest/` |

Refer to `postman_collection.json` and `collection.openapi` for full API documentation with example requests and responses.

---

## Testing with Postman

1. Import `postman_collection.json` into Postman
2. Tokens are automatically set after login/signup — no manual pasting required
3. Use the provided example data as a starting point; feel free to modify values to test different scenarios

---

## Database

SportsDeck uses **SQLite**, a file-based database. No external database server is required. The database file (`dev.db`) is automatically created when you run the startup script.

To inspect the database visually:

```bash
cd sportsdeck-app
./node_modules/.bin/prisma studio
```
