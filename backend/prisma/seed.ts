// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('123456', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'david@test.com' },
    update: {},
    create: {
      name: 'David',
      email: 'david@test.com',
      passwordHash,
      sport: 'Futebol',
      position: 'Meio-campista',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'joao@test.com' },
    update: {},
    create: {
      name: 'Joao Silva',
      email: 'joao@test.com',
      passwordHash,
      sport: 'Futebol',
      position: 'Goleiro',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'maria@test.com' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'maria@test.com',
      passwordHash,
      sport: 'Volei',
      position: 'Levantadora',
    },
  });

  const nextThursday = new Date();
  nextThursday.setDate(nextThursday.getDate() + ((4 - nextThursday.getDay() + 7) % 7 || 7));
  nextThursday.setHours(20, 0, 0, 0);

  await prisma.pelada.create({
    data: {
      title: 'Peladinha da Quinta',
      sport: 'Futebol',
      dateTime: nextThursday,
      location: 'Quadra do SESI',
      locationAddress: 'Av. do Contorno, 1234 - Belo Horizonte',
      price: 15.0,
      isRecurring: true,
      recurrenceDay: 'thursday',
      maxPlayers: 14,
      organizerId: user1.id,
    },
  });

  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
  nextSaturday.setHours(16, 0, 0, 0);

  await prisma.pelada.create({
    data: {
      title: 'Volei de Sabado',
      sport: 'Volei',
      dateTime: nextSaturday,
      location: 'Praia de Copacabana',
      price: null,
      isRecurring: false,
      maxPlayers: 12,
      organizerId: user3.id,
    },
  });

  console.log('Seed concluido!');
  console.log('Usuarios criados:', user1.name, user2.name, user3.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });