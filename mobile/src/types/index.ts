// Type definitions for INFUT

export interface UserStats {
  totalGames: number;
  totalGoals: number;
  totalAssists: number;
  totalWins: number;
  organizedCount: number;
  mvpVotes: number;
  goalkeeperVotes: number;
  noShows: number;
  attendanceRate: number;
}

export interface RankingPlayer {
  id: string;
  name: string;
  sport: string | null;
  position: string | null;
  region: string | null;
  totalGames: number;
  totalGoals: number;
  totalAssists: number;
  totalWins: number;
  mvpVotes: number;
  goalkeeperVotes: number;
  attendanceRate: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  sport: string | null;
  position: string | null;
  photoUrl: string | null;
  region: string | null;
  createdAt: string;
  updatedAt?: string;
  stats?: UserStats;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type PlayerRole = 'ORGANIZER' | 'CO_ORGANIZER' | 'PLAYER';
export type PlayerStatus = 'CONFIRMED' | 'WAITLIST' | 'DECLINED';
export type PaymentStatus = 'PENDING' | 'WAITING_CONFIRMATION' | 'PAID' | 'EXEMPT';
export type MemberType = 'MENSALISTA' | 'DIARISTA';
export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'INJURED' | 'NO_SHOW';
export type PeladaLifecycleStatus = 'OPEN' | 'IN_PROGRESS' | 'FINISHED';
export type PeladaGameMode = 'WINNER_STAYS_QUEUE' | 'FIXED_TEAMS';
export type PeladaDrawMode = 'POSITION' | 'RANDOM' | 'MANUAL';
export type PeladaVotingStatus = 'OPEN' | 'CLOSED';

export interface PeladaGameConfig {
  matchDurationMinutes: number;
  playersPerTeam: number;
  gameMode: PeladaGameMode;
  drawMode: PeladaDrawMode;
  fixedTeamsCount: number;
  teamNames: string[];
  maxConsecutiveWins?: number;
}

export interface PeladaPlayer {
  id: string;
  peladaId: string;
  userId: string | null;
  guestName: string | null;
  displayName: string;
  role: PlayerRole;
  status: PlayerStatus;
  isGoalkeeper: boolean;
  position: string | null;
  paymentStatus: PaymentStatus;
  memberType: MemberType;
  attendanceStatus: AttendanceStatus;
  goals: number;
  assists: number;
  wins: number;
  votedMvpForId: string | null;
  votedGoalkeeperForId: string | null;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    sport: string | null;
    position: string | null;
    photoUrl: string | null;
    region: string | null;
  } | null;
}

export interface DrawnTeamPlayer {
  id: string;
  name: string;
  position: string | null;
  isGoalkeeper: boolean;
}

export interface DrawnTeam {
  name: string;
  players: DrawnTeamPlayer[];
  consecutiveWins?: number;
}

export interface MatchRecord {
  id: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  winner: string;
  finishedAt: string;
  leavingTeamName?: string;
}

export interface FinancialSummary {
  unitPrice: number;
  totalExpected: number;
  totalPaid: number;
  paidCount: number;
  waitingCount: number;
  pendingCount: number;
  exemptCount: number;
}

export interface MvpRankEntry {
  playerId: string;
  displayName: string;
  votes: number;
}

export interface PeladaPastEdition {
  id: string;
  title: string;
  dateTime: string;
  durationHours?: number;
  status: PeladaLifecycleStatus;
  votingStatus?: PeladaVotingStatus;
  inviteCode: string;
  matchesCount: number;
  matches: MatchRecord[];
  confirmedCount: number;
  teams: DrawnTeam[];
  mvp: {
    playerId: string;
    displayName: string;
    photoUrl?: string | null;
    votes: number;
  } | null;
  mvpWinner?: {
    playerId?: string;
    id?: string;
    displayName: string;
    photoUrl?: string | null;
    votes: number;
  } | null;
}

export interface Pelada {
  id: string;
  seriesId?: string | null;
  title: string;
  sport: string;
  dateTime: string;
  location: string;
  locationAddress: string | null;
  price: number | null;
  isRecurring: boolean;
  recurrenceDay: string | null;
  recurrenceDays?: string | null;
  maxPlayers: number | null;
  inviteCode: string;
  isPublic: boolean;
  pixKey: string | null;
  goalkeepersExempt: boolean;
  playersPerTeam: number;
  cancelDeadlineHours: number;
  durationHours: number;
  whatsappGroupUrl: string | null;
  status: PeladaLifecycleStatus;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  pastEditionsCount?: number;
  pastEditions?: PeladaPastEdition[];
  activeEditionId?: string;
  isLatestEdition?: boolean;
  organizer: {
    id: string;
    name: string;
    email?: string;
    photoUrl: string | null;
    region?: string | null;
  };
  players: PeladaPlayer[];
  teams: DrawnTeam[];
  waitingQueue?: DrawnTeamPlayer[];
  lastLoserPool?: DrawnTeamPlayer[];
  lastRotationSummary?: string | null;
  gameConfig?: PeladaGameConfig;
  votingStatus?: PeladaVotingStatus;
  votesCastCount?: number;
  eligibleVotersCount?: number;
  matches: MatchRecord[];
  confirmedCount: number;
  confirmedFieldCount: number;
  confirmedGoalkeepersCount: number;
  waitlistCount: number;
  myRole: PlayerRole | null;
  myStatus: PlayerStatus | null;
  myPlayer: PeladaPlayer | null;
  financialSummary: FinancialSummary;
  mvpRanking: MvpRankEntry[];
  goalkeeperRanking: MvpRankEntry[];
}

export interface CreatePeladaInput {
  title: string;
  sport: string;
  dateTime: string;
  location: string;
  locationAddress?: string | null;
  price?: number | null;
  isRecurring?: boolean;
  recurrenceDay?: string | null;
  recurrenceDays?: string | null;
  maxPlayers?: number | null;
  isPublic?: boolean;
  pixKey?: string | null;
  goalkeepersExempt?: boolean;
  playersPerTeam?: number;
  cancelDeadlineHours?: number;
  durationHours?: number;
  whatsappGroupUrl?: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  sport?: string;
  position?: string;
  photoUrl?: string | null;
  region?: string | null;
}
