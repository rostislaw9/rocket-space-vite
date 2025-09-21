import { initializeApp } from 'firebase/app';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { AuthContext, type UserProfile } from './auth-context';

import { getOrCreateUser, getUserInfo } from '@/utils/api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadBackendProfile = async (fbUser: FirebaseUser, token: string) => {
    const storedUserId = localStorage.getItem('userId');

    if (storedUserId) {
      try {
        const res = await getUserInfo(storedUserId);
        const userData = res.data;
        if (
          userData?.firebaseUID === fbUser.uid ||
          userData?.email === fbUser.email
        ) {
          setUser(userData as UserProfile);
          return userData as UserProfile;
        }

        localStorage.removeItem('userId');
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status && ![401, 403, 404].includes(status)) {
          throw err;
        }

        localStorage.removeItem('userId');
      }
    }

    const res = await getOrCreateUser(
      fbUser.email ?? '',
      fbUser.uid,
      token,
      fbUser.displayName,
    );
    const userData = res.data;
    localStorage.setItem('userId', userData.id);
    setUser(userData as UserProfile);
    return userData as UserProfile;
  };

  const logout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setUser(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
  };

  const login = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const token = await fbUser.getIdToken();
      localStorage.setItem('token', token);
      setFirebaseUser(fbUser);
      await loadBackendProfile(fbUser, token);
    } catch (err) {
      console.error('Login failed:', err);
      setError(true);
      await logout();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    setError(false);
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        const res = await getUserInfo(userId);
        setUser(res.data as UserProfile);
      } else if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('token', token);
        await loadBackendProfile(firebaseUser, token);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        console.warn('User not found in backend, logging out.');
        await logout();
      } else {
        console.error('Failed to refresh profile:', err);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          const token = await fbUser.getIdToken();
          localStorage.setItem('token', token);
          await loadBackendProfile(fbUser, token);
        } else {
          await logout();
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        login,
        logout,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
