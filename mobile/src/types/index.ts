// Type definitions for INFUT

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
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Pelada {
  id: string;
  title: string;
  sport: string;
  dateTime: string;
  location: string;
  locationAddress: string | null;
  price: number | null;
  isRecurring: boolean;
  recurrenceDay: string | null;
  maxPlayers: number | null;
  organizerId: string;
  inviteCode: string | null;
  createdAt: string;
  updatedAt: string;
  organizer: {
    id: string;
    name: string;
    photoUrl: string | null;
  };
  participants?: {
    id: string;
    status: string;
    absenceReason: string | null;
    paid: boolean;
    user: {
      id: string;
      name: string;
      photoUrl: string | null;
    };
  }[];
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
  maxPlayers?: number | null;
}

export interface UpdateProfileInput {
  name?: string;
  sport?: string;
  position?: string;
  photoUrl?: string | null;
  region?: string | null;
}