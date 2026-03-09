-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "avatarUrl" TEXT,
    "favoriteTeamId" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "authProvider" TEXT,
    "providerUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refresh_token" TEXT,
    CONSTRAINT "User_favoriteTeamId_fkey" FOREIGN KEY ("favoriteTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("authProvider", "avatarUrl", "createdAt", "email", "favoriteTeamId", "id", "isBanned", "passwordHash", "providerUserId", "refresh_token", "role", "username") SELECT "authProvider", "avatarUrl", "createdAt", "email", "favoriteTeamId", "id", "isBanned", "passwordHash", "providerUserId", "refresh_token", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
