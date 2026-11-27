import { describe, expect, it } from 'vitest';
import { rotateWinnerAtLimit, shuffleArray, type RotationPlayer } from '../rotation';

const line = (id: string): RotationPlayer => ({ id, name: id, position: null, isGoalkeeper: false });
const gk = (id: string): RotationPlayer => ({ id, name: id, position: 'GOLEIRO', isGoalkeeper: true });
const ids = (list: RotationPlayer[]) => list.map((p) => p.id);
// rng deterministico: sempre escolhe o ultimo indice (mantem a ordem no Fisher-Yates)
const noShuffle = () => 0.999999;

describe('rotateWinnerAtLimit', () => {
  it('troca todos os jogadores de linha pelos de fora, na ordem (fila primeiro, depois perdedor anterior)', () => {
    const result = rotateWinnerAtLimit({
      leavingTeamPlayers: [gk('G1'), line('A1'), line('A2'), line('A3')],
      waitingQueue: [line('Q1'), line('Q2')],
      lastLoserPool: [line('L1'), line('L2')],
      perTeam: 3,
    });

    expect(ids(result.enteredFromOutside)).toEqual(['Q1', 'Q2', 'L1']);
    expect(result.keptFromLeavingTeam).toEqual([]);
    expect(ids(result.waitingQueue)).toEqual(['L2']);
    expect(ids(result.lastLoserPool)).toEqual(['A1', 'A2', 'A3']);
  });

  it('nao sorteia quando ha gente suficiente fora (resultado nao depende do rng)', () => {
    const input = {
      leavingTeamPlayers: [line('A1'), line('A2')],
      waitingQueue: [line('Q1'), line('Q2'), line('Q3')],
      lastLoserPool: [],
      perTeam: 2,
    };
    const a = rotateWinnerAtLimit({ ...input, rng: () => 0 });
    const b = rotateWinnerAtLimit({ ...input, rng: () => 0.99 });
    expect(ids(a.incomingTeamPlayers)).toEqual(['Q1', 'Q2']);
    expect(ids(b.incomingTeamPlayers)).toEqual(ids(a.incomingTeamPlayers));
    expect(ids(a.waitingQueue)).toEqual(['Q3']);
  });

  it('quando os de fora nao completam o time, mantem jogadores do time que saiu para completar', () => {
    const result = rotateWinnerAtLimit({
      leavingTeamPlayers: [line('A1'), line('A2'), line('A3')],
      waitingQueue: [line('Q1')],
      lastLoserPool: [],
      perTeam: 3,
      rng: noShuffle,
    });

    expect(ids(result.enteredFromOutside)).toEqual(['Q1']);
    expect(result.keptFromLeavingTeam).toHaveLength(2);
    expect(result.incomingTeamPlayers).toHaveLength(3);
    const kept = new Set(ids(result.keptFromLeavingTeam));
    // quem nao foi mantido vai para o perdedor anterior; ninguem some nem duplica
    expect(ids(result.lastLoserPool).every((id) => !kept.has(id))).toBe(true);
    expect([...ids(result.keptFromLeavingTeam), ...ids(result.lastLoserPool)].sort()).toEqual(['A1', 'A2', 'A3']);
  });

  it('goleiro continua quando nao ha outro goleiro fora', () => {
    const result = rotateWinnerAtLimit({
      leavingTeamPlayers: [gk('G1'), line('A1'), line('A2')],
      waitingQueue: [line('Q1'), line('Q2')],
      lastLoserPool: [],
      perTeam: 2,
    });

    expect(result.incomingGoalkeeper).toBeNull();
    expect(result.goalkeeperStayed?.id).toBe('G1');
    expect(ids(result.incomingTeamPlayers)).toEqual(['G1', 'Q1', 'Q2']);
    expect(ids(result.lastLoserPool)).not.toContain('G1');
  });

  it('goleiro sai quando ha outro goleiro fora, e vai para o fim da fila', () => {
    const result = rotateWinnerAtLimit({
      leavingTeamPlayers: [gk('G1'), line('A1'), line('A2')],
      waitingQueue: [line('Q1'), gk('G2'), line('Q2'), line('Q3')],
      lastLoserPool: [],
      perTeam: 2,
    });

    expect(result.incomingGoalkeeper?.id).toBe('G2');
    expect(result.goalkeeperStayed).toBeNull();
    expect(ids(result.incomingTeamPlayers)).toEqual(['G2', 'Q1', 'Q2']);
    expect(ids(result.waitingQueue)).toEqual(['Q3', 'G1']);
  });

  it('time sem goleiro nao inventa goleiro', () => {
    const result = rotateWinnerAtLimit({
      leavingTeamPlayers: [line('A1')],
      waitingQueue: [line('Q1')],
      lastLoserPool: [],
      perTeam: 1,
    });
    expect(result.goalkeeperStayed).toBeNull();
    expect(result.incomingGoalkeeper).toBeNull();
    expect(ids(result.incomingTeamPlayers)).toEqual(['Q1']);
  });

  it('nenhum jogador some ou se duplica na rotacao', () => {
    const leaving = [gk('G1'), line('A1'), line('A2'), line('A3'), line('A4')];
    const queue = [line('Q1'), gk('G2'), line('Q2')];
    const losers = [line('L1'), line('L2'), line('L3')];
    const result = rotateWinnerAtLimit({
      leavingTeamPlayers: leaving,
      waitingQueue: queue,
      lastLoserPool: losers,
      perTeam: 4,
      rng: () => 0.3,
    });
    const all = [...result.incomingTeamPlayers, ...result.waitingQueue, ...result.lastLoserPool];
    expect(ids(all).sort()).toEqual(ids([...leaving, ...queue, ...losers]).sort());
  });

  it('perTeam invalido e tratado como 1', () => {
    const result = rotateWinnerAtLimit({
      leavingTeamPlayers: [line('A1')],
      waitingQueue: [line('Q1'), line('Q2')],
      lastLoserPool: [],
      perTeam: 0,
    });
    expect(ids(result.enteredFromOutside)).toEqual(['Q1']);
  });
});

describe('shuffleArray', () => {
  it('nao altera o array original e mantem os mesmos itens', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original, () => 0.1);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort()).toEqual(original);
  });
});
