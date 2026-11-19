// prisma/seed.ts
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/utils/prisma';

const SEED_USERS = [
  { name: 'David Nunes', email: 'david@test.com', sport: 'Futebol', position: 'Meio-campista', region: 'Centro - Belo Horizonte' },
  { name: 'Joao Silva', email: 'joao@test.com', sport: 'Futebol', position: 'Goleiro', region: 'Pampulha - Belo Horizonte' },
  { name: 'Maria Santos', email: 'maria@test.com', sport: 'Vôlei', position: 'Levantador(a)', region: 'Savassi - Belo Horizonte' },
  { name: 'Pedro Costa', email: 'pedro@test.com', sport: 'Futebol', position: 'Atacante', region: 'Centro - Belo Horizonte' },
  { name: 'Lucas Ferreira', email: 'lucas@test.com', sport: 'Futebol', position: 'Zagueiro', region: 'Funcionários - Belo Horizonte' },
  { name: 'Rafael Oliveira', email: 'rafael@test.com', sport: 'Futebol', position: 'Lateral', region: 'Lourdes - Belo Horizonte' },
  { name: 'Gabriel Souza', email: 'gabriel@test.com', sport: 'Futebol', position: 'Volante', region: 'Floresta - Belo Horizonte' },
  { name: 'Matheus Almeida', email: 'matheus@test.com', sport: 'Futebol', position: 'Atacante', region: 'Barreiro - Belo Horizonte' },
  { name: 'Bruno Lima', email: 'bruno@test.com', sport: 'Futebol', position: 'Goleiro', region: 'Santa Tereza - Belo Horizonte' },
  { name: 'Felipe Rocha', email: 'felipe@test.com', sport: 'Futebol', position: 'Meio-campista', region: 'Buritis - Belo Horizonte' },
  { name: 'Gustavo Mendes', email: 'gustavo@test.com', sport: 'Futebol', position: 'Zagueiro', region: 'Castelo - Belo Horizonte' },
  { name: 'Rodrigo Ribeiro', email: 'rodrigo@test.com', sport: 'Futebol', position: 'Lateral', region: 'Serra - Belo Horizonte' },
  { name: 'Thiago Martins', email: 'thiago@test.com', sport: 'Futebol', position: 'Volante', region: 'Sion - Belo Horizonte' },
  { name: 'Leonardo Carvalho', email: 'leonardo@test.com', sport: 'Futebol', position: 'Atacante', region: 'Gutierrez - Belo Horizonte' },
  { name: 'Daniel Barbosa', email: 'daniel@test.com', sport: 'Futebol', position: 'Meio-campista', region: 'Prado - Belo Horizonte' },
  { name: 'Marcelo Cardoso', email: 'marcelo@test.com', sport: 'Futebol', position: 'Goleiro', region: 'Cidade Nova - Belo Horizonte' },
  { name: 'Andre Teixeira', email: 'andre@test.com', sport: 'Futebol', position: 'Zagueiro', region: 'Carlos Prates - Belo Horizonte' },
  { name: 'Caio Gomes', email: 'caio@test.com', sport: 'Futebol', position: 'Lateral', region: 'Santo Agostinho - Belo Horizonte' },
  { name: 'Diego Moreira', email: 'diego@test.com', sport: 'Futebol', position: 'Atacante', region: 'Anchieta - Belo Horizonte' },
  { name: 'Vitor Araujo', email: 'vitor@test.com', sport: 'Futebol', position: 'Volante', region: 'Coração Eucarístico - Belo Horizonte' },
  { name: 'Eduardo Vieira', email: 'eduardo@test.com', sport: 'Futebol', position: 'Meio-campista', region: 'Padre Eustáquio - Belo Horizonte' },
  { name: 'Henrique Dias', email: 'henrique@test.com', sport: 'Futebol', position: 'Zagueiro', region: 'Ouro Preto - Belo Horizonte' },
];

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('123456', 10);

  const users = [];
  for (const u of SEED_USERS) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        sport: u.sport,
        position: u.position,
        region: u.region,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        sport: u.sport,
        position: u.position,
        region: u.region,
      },
    });
    users.push(created);
  }

  const [user1, user2, user3, user4] = users;

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

  const quintaPlayers = users.map((u, idx) => {
    const isGk = u.position === 'Goleiro';
    const role = idx === 0 ? 'ORGANIZER' : idx === 1 ? 'CO_ORGANIZER' : 'PLAYER';
    const status = idx >= 20 ? 'WAITLIST' : 'CONFIRMED';
    const memberType = idx < 12 ? 'MENSALISTA' : 'DIARISTA';
    let paymentStatus: string;
    if (isGk) {
      paymentStatus = 'EXEMPT';
    } else if (idx % 4 === 0 || idx === 0) {
      paymentStatus = 'PAID';
    } else if (idx % 4 === 2) {
      paymentStatus = 'WAITING_CONFIRMATION';
    } else {
      paymentStatus = 'PENDING';
    }

    return {
      userId: u.id,
      role,
      status,
      isGoalkeeper: isGk,
      position: u.position,
      paymentStatus,
      memberType,
      attendanceStatus: status === 'CONFIRMED' ? 'PRESENT' : 'PENDING',
      goals: idx % 5 === 0 ? 2 : idx % 3 === 0 ? 1 : 0,
      assists: idx % 4 === 0 ? 1 : 0,
      wins: idx % 2 === 0 ? 1 : 0,
    };
  });

  const quintaPelada = await prisma.pelada.create({
    data: {
      title: 'Peladinha da Quinta',
      sport: 'Futebol',
      dateTime: nextThursday,
      durationHours: 2,
      whatsappGroupUrl: 'https://chat.whatsapp.com/InfutQuinta123',
      location: 'Quadra do SESI',
      locationAddress: 'Av. do Contorno, 1234 - Centro, Belo Horizonte',
      price: 15.0,
      isRecurring: true,
      recurrenceDay: 'thursday',
      maxPlayers: 17,
      inviteCode: 'QUINTA',
      isPublic: true,
      pixKey: 'david@test.com',
      goalkeepersExempt: true,
      playersPerTeam: 5,
      cancelDeadlineHours: 4,
      organizerId: user1.id,
      players: {
        create: quintaPlayers,
      },
    },
    include: { players: { include: { user: true } } },
  });

  const confirmedQuinta = quintaPelada.players.filter((p) => p.status === 'CONFIRMED');
  const teamNames = ['Time Amarelo', 'Time Azul', 'Time Vermelho'];
  const quintaTeams = teamNames.map((name, teamIdx) => ({
    name,
    players: confirmedQuinta
      .filter((_, idx) => idx % 3 === teamIdx)
      .map((p) => ({
        id: p.id,
        name: p.user?.name || p.guestName || 'Convidado',
        position: p.position,
        isGoalkeeper: p.isGoalkeeper,
      })),
  }));

  const quintaMatches = [
    {
      id: '1',
      teamAName: 'Time Amarelo',
      teamBName: 'Time Azul',
      scoreA: 3,
      scoreB: 1,
      winner: 'Time Amarelo',
      finishedAt: new Date().toISOString(),
    },
  ];

  await prisma.pelada.update({
    where: { id: quintaPelada.id },
    data: {
      teamsJson: JSON.stringify({
        version: 2,
        teams: quintaTeams,
        waitingQueue: [],
        lastLoserPool: [],
        lastRotationSummary: null,
        config: {
          matchDurationMinutes: 10,
          playersPerTeam: 5,
          gameMode: 'WINNER_STAYS_QUEUE',
          drawMode: 'POSITION',
          fixedTeamsCount: 3,
          teamNames: ['Time Amarelo', 'Time Azul', 'Time Vermelho'],
        },
        votingStatus: 'OPEN',
      }),
      matchesJson: JSON.stringify(quintaMatches),
    },
  });

  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
  nextSaturday.setHours(16, 0, 0, 0);

  await prisma.pelada.create({
    data: {
      title: 'Vôlei de Sábado',
      sport: 'Vôlei',
      dateTime: nextSaturday,
      durationHours: 2,
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
      durationHours: 1.5,
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
  console.log(`Usuarios criados: ${users.length} contas (senha padrao: 123456)`);
  console.log('Peladinha da Quinta jogadores:', quintaPelada.players.length);
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
