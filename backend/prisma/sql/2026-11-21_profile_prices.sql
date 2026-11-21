-- INFUT: perfil estendido + valores por tipo de jogador (PostgreSQL)
-- Equivalente a rodar `npx prisma db push` com o schema atualizado.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "favorite_team" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "idol" TEXT;
ALTER TABLE "peladas" ADD COLUMN IF NOT EXISTS "price_goalkeeper" DOUBLE PRECISION;
ALTER TABLE "peladas" ADD COLUMN IF NOT EXISTS "price_monthly" DOUBLE PRECISION;
