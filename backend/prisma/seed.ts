// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('123456', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'david@test.com' },
    update: {
      name: 'David Nunes',
      sport: 'Futebol',
      position: 'Meio-campista',
      region: 'Centro - Belo Horizonte',
    },
    create: {
      name: 'David Nunes',
      email: 'david@test.com',
      passwordHash,
      sport: 'Futebol',
      position: 'Meio-campista',
      region: 'Centro - Belo Horizonte',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'joao@test.com' },
    update: {
      name: 'Joao Silva',
      sport: 'Futebol',
      position: 'Goleiro',
      region: 'Pampulha - Belo Horizonte',
    },
    create: {
      name: 'Joao Silva',
      email: 'joao@test.com',
      passwordHash,
      sport: 'Futebol',
      position: 'Goleiro',
      region: 'Pampulha - Belo Horizonte',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'maria@test.com' },
    update: {
      name: 'Maria Santos',
      sport: 'Vôlei',
      position: 'Levantador(a)',
      region: 'Savassi - Belo Horizonte',
    },
    create: {
      name: 'Maria Santos',
      email: 'maria@test.com',
      passwordHash,
      sport: 'Vôlei',
      position: 'Levantador(a)',
      region: 'Savassi - Belo Horizonte',
    },
  });

  const user4 = await prisma.user.upsert({
    where: { email: 'pedro@test.com' },
    update: {
      name: 'Pedro Costa',
      sport: 'Futebol',
      position: 'Atacante',
      region: 'Centro - Belo Horizonte',
    },
    create: {
      name: 'Pedro Costa',
      email: 'pedro@test.com',
      passwordHash,
      sport: 'Futebol',
      position: 'Atacante',
      region: 'Centro - Belo Horizonte',
    },
  });

  // Limpar peladas antigas de seed para manter idempotencia
  await prisma.pelada.deleteMany({
    where: {
      OR: [
        { inviteCode: { in: ['QUINTA', 'VOLEI1', 'FUTSAL'] } },
        { title: 'Peladinha da Quinta' },
        { title: 'Volei de Sabado' },
      ],
    },
  });

  const nextThursday = new Date();
  nextThursday.setDate(nextThursday.getDate() + ((4 - nextThursday.getDay() + 7) % 7 || 7));
  nextThursday.setHours(20, 0, 0, 0);

  const quintaPelada = await prisma.pelada.create({
    data: {
      title: 'Peladinha da Quinta',
      sport: 'Futebol',
      dateTime: nextThursday,
      location: 'Quadra do SESI',
      locationAddress: 'Av. do Contorno, 1234 - Centro, Belo Horizonte',
      price: 15.0,
      isRecurring: true,
      recurrenceDay: 'thursday',
      maxPlayers: 14,
      inviteCode: 'QUINTA',
      isPublic: true,
      pixKey: 'david@test.com',
      goalkeepersExempt: true,
      playersPerTeam: 5,
      cancelDeadlineHours: 4,
      organizerId: user1.id,
      players: {
        create: [
          {
            userId: user1.id,
            role: 'ORGANIZER',
            status: 'CONFIRMED',
            isGoalkeeper: false,
            position: 'Meio-campista',
            paymentStatus: 'PAID',
            memberType: 'MENSALISTA',
            attendanceStatus: 'PRESENT',
            goals: 2,
            assists: 1,
            wins: 1,
          },
          {
            userId: user2.id,
            role: 'CO_ORGANIZER',
            status: 'CONFIRMED',
            isGoalkeeper: true,
            position: 'Goleiro',
            paymentStatus: 'EXEMPT',
            memberType: 'MENSALISTA',
            attendanceStatus: 'PRESENT',
            goals: 0,
            assists: 0,
            wins: 0,
          },
          {
            userId: user4.id,
            role: 'PLAYER',
            status: 'CONFIRMED',
            isGoalkeeper: false,
            position: 'Atacante',
            paymentStatus: 'WAITING_CONFIRMATION',
            memberType: 'DIARISTA',
            attendanceStatus: 'PRESENT',
            goals: 3,
            assists: 0,
            wins: 1,
          },
          {
            guestName: 'Lucas (Convidado)',
            role: 'PLAYER',
            status: 'CONFIRMED',
            isGoalkeeper: false,
            position: 'Zagueiro',
            paymentStatus: 'PENDING',
            memberType: 'DIARISTA',
            attendanceStatus: 'PRESENT',
            goals: 0,
            assists: 1,
            wins: 0,
          },
          {
            guestName: 'Rafael (Convidado)',
            role: 'PLAYER',
            status: 'CONFIRMED',
            isGoalkeeper: false,
            position: 'Lateral',
            paymentStatus: 'PAID',
            memberType: 'DIARISTA',
            attendanceStatus: 'PRESENT',
            goals: 1,
            assists: 2,
            wins: 1,
          },
        ],
      },
    },
    include: { players: { include: { user: true } } },
  });

  // Sortear times iniciais para a Peladinha da Quinta
  const quintaTeams = [
    {
      name: 'Time 1',
      players: quintaPelada.players
        .filter((_, idx) => idx % 2 === 0)
        .map((p) => ({
          id: p.id,
          name: p.user?.name || p.guestName || 'Convidado',
          position: p.position,
          isGoalkeeper: p.isGoalkeeper,
        })),
    },
    {
      name: 'Time 2',
      players: quintaPelada.players
        .filter((_, idx) => idx % 2 === 1)
        .map((p) => ({
          id: p.id,
          name: p.user?.name || p.guestName || 'Convidado',
          position: p.position,
          isGoalkeeper: p.isGoalkeeper,
        })),
    },
  ];

  const quintaMatches = [
    {
      id: '1',
      teamAName: 'Time 1',
      teamBName: 'Time 2',
      scoreA: 3,
      scoreB: 1,
      winner: 'Time 1',
      finishedAt: new Date().toISOString(),
    },
  ];

  await prisma.pelada.update({
    where: { id: quintaPelada.id },
    data: {
      teamsJson: JSON.stringify(quintaTeams),
      matchesJson: JSON.stringify(quintaMatches),
    },
  });

  // Registrar votos iniciais (Craque no Pedro e Goleiro Paredao no Joao)
  const davidRecord = quintaPelada.players.find((p) => p.userId === user1.id);
  const joaoRecord = quintaPelada.players.find((p) => p.userId === user2.id);
  const pedroRecord = quintaPelada.players.find((p) => p.userId === user4.id);
  if (davidRecord && pedroRecord) {
    await prisma.peladaPlayer.update({
      where: { id: davidRecord.id },
      data: {
        votedMvpForId: pedroRecord.id,
        ...(joaoRecord && { votedGoalkeeperForId: joaoRecord.id }),
      },
    });
  }

  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
  nextSaturday.setHours(16, 0, 0, 0);

  await prisma.pelada.create({
    data: {
      title: 'Vôlei de Sábado',
      sport: 'Vôlei',
      dateTime: nextSaturday,
      location: 'Arena Savassi',
      locationAddress: 'Rua Pernambuco, 800 - Savassi, Belo Horizonte',
      price: null,
      isRecurring: false,
      maxPlayers: 12,
      inviteCode: 'VOLEI1',
      isPublic: true,
      goalkeepersExempt: false,
      playersPerTeam: 6,
      organizerId: user3.id,
      players: {
        create: [
          {
            userId: user3.id,
            role: 'ORGANIZER',
            status: 'CONFIRMED',
            isGoalkeeper: false,
            position: 'Levantador(a)',
            paymentStatus: 'EXEMPT',
          },
          {
            userId: user1.id,
            role: 'PLAYER',
            status: 'CONFIRMED',
            isGoalkeeper: false,
            position: 'Ponteiro(a)',
            paymentStatus: 'EXEMPT',
          },
        ],
      },
    },
  });

  const nextTuesday = new Date();
  nextTuesday.setDate(nextTuesday.getDate() + ((2 - nextTuesday.getDay() + 7) % 7 || 7));
  nextTuesday.setHours(21, 0, 0, 0);

  await prisma.pelada.create({
    data: {
      title: 'Futsal da Pampulha',
      sport: 'Futsal',
      dateTime: nextTuesday,
      location: 'Ginásio Pampulha',
      locationAddress: 'Av. Antônio Carlos, 4500 - Pampulha, Belo Horizonte',
      price: 20.0,
      isRecurring: true,
      recurrenceDay: 'tuesday',
      maxPlayers: 10,
      inviteCode: 'FUTSAL',
      isPublic: true,
      pixKey: '31999990000',
      goalkeepersExempt: true,
      playersPerTeam: 5,
      organizerId: user2.id,
      players: {
        create: [
          {
            userId: user2.id,
            role: 'ORGANIZER',
            status: 'CONFIRMED',
            isGoalkeeper: true,
            position: 'Goleiro',
            paymentStatus: 'EXEMPT',
          },
          {
            userId: user4.id,
            role: 'PLAYER',
            status: 'CONFIRMED',
            isGoalkeeper: false,
            position: 'Pivô',
            paymentStatus: 'PAID',
          },
        ],
      },
    },
  });

  console.log('Seed concluido!');
  console.log('Usuarios criados:', user1.email, user2.email, user3.email, user4.email);
  console.log('Codigos de peladas:', 'QUINTA', 'VOLEI1', 'FUTSAL');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
