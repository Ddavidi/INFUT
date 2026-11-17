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
    "cancel_deadline_hours" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "teams_json" TEXT,
    "matches_json" TEXT,
    "organizer_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "peladas_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_peladas" ("cancel_deadline_hours", "created_at", "date_time", "goalkeepers_exempt", "id", "invite_code", "is_public", "is_recurring", "location", "location_address", "matches_json", "max_players", "organizer_id", "pix_key", "players_per_team", "price", "recurrence_day", "sport", "teams_json", "title", "updated_at") SELECT "cancel_deadline_hours", "created_at", "date_time", "goalkeepers_exempt", "id", "invite_code", "is_public", "is_recurring", "location", "location_address", "matches_json", "max_players", "organizer_id", "pix_key", "players_per_team", "price", "recurrence_day", "sport", "teams_json", "title", "updated_at" FROM "peladas";
DROP TABLE "peladas";
ALTER TABLE "new_peladas" RENAME TO "peladas";
CREATE UNIQUE INDEX "peladas_invite_code_key" ON "peladas"("invite_code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
