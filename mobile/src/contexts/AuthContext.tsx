// Auth Context - Global authentication state (Issue #17)
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import { saveToken, getToken, removeToken, saveUser, getUser, removeUser, clearAll } from '../utils/storage';
import { loginUser, registerUser } from '../services/authService';
import { getProfile } from '../services/userService';

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved session on app start
  useEffect(() => {
    async function loadStoredSession() {
      try {
        const storedToken = await getToken();
        const storedUser = await getUser();
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredSession();
  }, []);

  const handleAuth = useCallback(async (response: AuthResponse) => {
    setToken(response.token);
    setUser(response.user);
    await saveToken(response.token);
    await saveUser(response.user);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await loginUser(email, password);
    await handleAuth(response);
  }, [handleAuth]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const response = await registerUser(name, email, password);
    await handleAuth(response);
  }, [handleAuth]);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await clearAll();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const updatedUser = await getProfile();
      setUser(updatedUser);
      await saveUser(updatedUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}