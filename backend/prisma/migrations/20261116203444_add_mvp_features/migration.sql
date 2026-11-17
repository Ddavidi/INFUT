/*
  Warnings:

  - The required column `invite_code` was added to the `peladas` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateTable
CREATE TABLE "pelada_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pelada_id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "is_goalkeeper" BOOLEAN NOT NULL DEFAULT false,
    "position" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "voted_mvp_for_id" TEXT,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pelada_players_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "peladas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pelada_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_peladas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "date_time" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "location_address" TEXT,
    "price" REAL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_day" TEXT,
    "max_players" INTEGER,
    "invite_code" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "pix_key" TEXT,
    "goalkeepers_exempt" BOOLEAN NOT NULL DEFAULT true,
    "players_per_team" INTEGER NOT NULL DEFAULT 5,
    "teams_json" TEXT,
    "organizer_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "peladas_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_peladas" ("created_at", "date_time", "id", "invite_code", "is_recurring", "location", "location_address", "max_players", "organizer_id", "price", "recurrence_day", "sport", "title", "updated_at") SELECT "created_at", "date_time", "id", upper(hex(randomblob(3))), "is_recurring", "location", "location_address", "max_players", "organizer_id", "price", "recurrence_day", "sport", "title", "updated_at" FROM "peladas";
DROP TABLE "peladas";
ALTER TABLE "new_peladas" RENAME TO "peladas";
CREATE UNIQUE INDEX "peladas_invite_code_key" ON "peladas"("invite_code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "pelada_players_pelada_id_user_id_key" ON "pelada_players"("pelada_id", "user_id");
