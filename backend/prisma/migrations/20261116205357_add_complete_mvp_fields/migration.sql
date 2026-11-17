-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pelada_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pelada_id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "is_goalkeeper" BOOLEAN NOT NULL DEFAULT false,
    "position" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "member_type" TEXT NOT NULL DEFAULT 'DIARISTA',
    "attendance_status" TEXT NOT NULL DEFAULT 'PENDING',
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "voted_mvp_for_id" TEXT,
    "voted_goalkeeper_for_id" TEXT,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pelada_players_pelada_id_fkey" FOREIGN KEY ("pelada_id") REFERENCES "peladas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pelada_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_pelada_players" ("assists", "goals", "guest_name", "id", "is_goalkeeper", "joined_at", "payment_status", "pelada_id", "position", "role", "status", "updated_at", "user_id", "voted_mvp_for_id") SELECT "assists", "goals", "guest_name", "id", "is_goalkeeper", "joined_at", "payment_status", "pelada_id", "position", "role", "status", "updated_at", "user_id", "voted_mvp_for_id" FROM "pelada_players";
DROP TABLE "pelada_players";
ALTER TABLE "new_pelada_players" RENAME TO "pelada_players";
CREATE UNIQUE INDEX "pelada_players_pelada_id_user_id_key" ON "pelada_players"("pelada_id", "user_id");
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
    "teams_json" TEXT,
    "matches_json" TEXT,
    "organizer_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "peladas_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_peladas" ("created_at", "date_time", "goalkeepers_exempt", "id", "invite_code", "is_public", "is_recurring", "location", "location_address", "max_players", "organizer_id", "pix_key", "players_per_team", "price", "recurrence_day", "sport", "teams_json", "title", "updated_at") SELECT "created_at", "date_time", "goalkeepers_exempt", "id", "invite_code", "is_public", "is_recurring", "location", "location_address", "max_players", "organizer_id", "pix_key", "players_per_team", "price", "recurrence_day", "sport", "teams_json", "title", "updated_at" FROM "peladas";
DROP TABLE "peladas";
ALTER TABLE "new_peladas" RENAME TO "peladas";
CREATE UNIQUE INDEX "peladas_invite_code_key" ON "peladas"("invite_code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
