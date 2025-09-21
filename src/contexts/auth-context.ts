import type { User as FirebaseUser } from 'firebase/auth';
import { createContext } from 'react';

import type { LocationPrivacy } from '@/types/location';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  title?: string;
  company?: string;
  latitude?: number;
  longitude?: number;
  locationText?: string;
  locationPrivacy?: LocationPrivacy;
  createdAt?: string;
  updatedAt?: string;
  roles?: string[];
}

export interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
