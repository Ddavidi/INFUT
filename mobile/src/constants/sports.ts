// Sports and positions mapping for INFUT (Issue #21)

export interface SportPosition {
  sport: string;
  emoji: string;
  positions: string[];
}

export const SPORTS: SportPosition[] = [
  {
    sport: 'Futebol',
    emoji: '⚽',
    positions: ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meio-campista', 'Meia-atacante', 'Atacante', 'Sem preferência'],
  },
  {
    sport: 'Futsal',
    emoji: '🏟️',
    positions: ['Goleiro', 'Fixo', 'Ala', 'Pivô', 'Sem preferência'],
  },
  {
    sport: 'Vôlei',
    emoji: '🏐',
    positions: ['Levantador(a)', 'Líbero', 'Ponteiro(a)', 'Central', 'Oposto(a)', 'Sem preferência'],
  },
  {
    sport: 'Basquete',
    emoji: '🏀',
    positions: ['Armador', 'Ala-armador', 'Ala', 'Ala-pivô', 'Pivô', 'Sem preferência'],
  },
  {
    sport: 'Handebol',
    emoji: '🤾',
    positions: ['Goleiro(a)', 'Armador(a)', 'Meia', 'Ponta', 'Pivô', 'Sem preferência'],
  },
  {
    sport: 'Beach Tennis',
    emoji: '🎾',
    positions: ['Sem preferência'],
  },
  {
    sport: 'Tênis de Mesa',
    emoji: '🏓',
    positions: ['Sem preferência'],
  },
  {
    sport: 'Outro',
    emoji: '🎯',
    positions: ['Sem preferência'],
  },
];

export function getPositionsForSport(sportName: string): string[] {
  const sport = SPORTS.find((s) => s.sport === sportName);
  return sport ? sport.positions : ['Sem preferência'];
}