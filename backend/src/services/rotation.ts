// src/services/rotation.ts
// Regras puras de rotacao de times (sem acesso a banco) para facilitar testes.

export interface RotationPlayer {
  id: string;
  name: string;
  position: string | null;
  isGoalkeeper: boolean;
}

export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface WinLimitRotationInput {
  /** Jogadores do time que atingiu o limite de vitorias seguidas (vai sair). */
  leavingTeamPlayers: RotationPlayer[];
  /** Fila de proximos, na ordem de chegada. */
  waitingQueue: RotationPlayer[];
  /** Perdedores da rodada anterior (estao fora, atras da fila). */
  lastLoserPool: RotationPlayer[];
  /** Jogadores de linha por time. */
  perTeam: number;
  rng?: () => number;
}

export interface WinLimitRotationResult {
  /** Novo time que entra no lugar do time que atingiu o limite (goleiro primeiro). */
  incomingTeamPlayers: RotationPlayer[];
  waitingQueue: RotationPlayer[];
  lastLoserPool: RotationPlayer[];
  /** Jogadores de linha que vieram de fora (fila + perdedor anterior), em ordem. */
  enteredFromOutside: RotationPlayer[];
  /** Jogadores de linha do time vencedor sorteados para completar (so quando falta gente fora). */
  keptFromLeavingTeam: RotationPlayer[];
  /** Goleiro que entrou (quando havia outro goleiro fora). */
  incomingGoalkeeper: RotationPlayer | null;
  /** Goleiro do time que saiu e permaneceu por nao haver outro goleiro fora. */
  goalkeeperStayed: RotationPlayer | null;
}

/**
 * Time atingiu o limite de vitorias seguidas:
 * - TODOS os jogadores de linha dele saem; entram os de fora na ordem (fila primeiro,
 *   depois o perdedor anterior), SEM sorteio.
 * - So quando os de fora nao completam um time, sorteia-se entre os que sairiam
 *   quem fica para completar.
 * - Goleiro so sai se houver outro goleiro fora; caso contrario, continua.
 */
export function rotateWinnerAtLimit(input: WinLimitRotationInput): WinLimitRotationResult {
  const rng = input.rng || Math.random;
  const perTeam = Math.max(1, input.perTeam);

  const leavingLine = input.leavingTeamPlayers.filter((p) => !p.isGoalkeeper);
  const leavingGks = input.leavingTeamPlayers.filter((p) => p.isGoalkeeper);

  const outsideLine = [
    ...input.waitingQueue.filter((p) => !p.isGoalkeeper),
    ...input.lastLoserPool.filter((p) => !p.isGoalkeeper),
  ];
  const outsideGks = [
    ...input.waitingQueue.filter((p) => p.isGoalkeeper),
    ...input.lastLoserPool.filter((p) => p.isGoalkeeper),
  ];

  const enteredFromOutside = outsideLine.slice(0, perTeam);
  const stillOutside = outsideLine.slice(perTeam);

  let keptFromLeavingTeam: RotationPlayer[] = [];
  let leavingLineOut = leavingLine;
  if (enteredFromOutside.length < perTeam) {
    const needed = perTeam - enteredFromOutside.length;
    const shuffled = shuffleArray(leavingLine, rng);
    keptFromLeavingTeam = shuffled.slice(0, needed);
    const keptIds = new Set(keptFromLeavingTeam.map((p) => p.id));
    leavingLineOut = leavingLine.filter((p) => !keptIds.has(p.id));
  }

  let incomingGoalkeeper: RotationPlayer | null = null;
  let goalkeeperStayed: RotationPlayer | null = null;
  let teamGks: RotationPlayer[] = [];
  let gksOutside: RotationPlayer[] = [];

  if (outsideGks.length > 0) {
    incomingGoalkeeper = outsideGks[0];
    teamGks = [outsideGks[0]];
    gksOutside = [...outsideGks.slice(1), ...leavingGks];
  } else {
    goalkeeperStayed = leavingGks[0] || null;
    teamGks = leavingGks.slice(0, 1);
    gksOutside = leavingGks.slice(1);
  }

  return {
    incomingTeamPlayers: [...teamGks, ...enteredFromOutside, ...keptFromLeavingTeam],
    // Quem ficou de fora continua na frente; goleiros reservas no final da fila
    waitingQueue: [...stillOutside, ...gksOutside],
    // Quem acabou de sair vai para o fim (atras de quem ja esperava)
    lastLoserPool: leavingLineOut,
    enteredFromOutside,
    keptFromLeavingTeam,
    incomingGoalkeeper,
    goalkeeperStayed: leavingGks.length > 0 && !incomingGoalkeeper ? goalkeeperStayed : null,
  };
}
