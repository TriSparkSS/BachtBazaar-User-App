import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authStorage } from '../services/authStorage';
import { userAuthApi } from '../services/userAuthApi';
import { PendingAuthState, UserProfile } from '../types/auth';

type AppContextValue = {
  authToken: string | null;
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  pendingAuth: PendingAuthState | null;
  setPendingAuth: (value: PendingAuthState | null) => void;
  setSession: (token: string, user: UserProfile) => Promise<void>;
  clearSession: () => Promise<void>;
};

const defaultValue: AppContextValue = {
  authToken: null,
  currentUser: null,
  isAuthenticated: false,
  isBootstrapping: true,
  pendingAuth: null,
  setPendingAuth: () => undefined,
  setSession: async () => undefined,
  clearSession: async () => undefined,
};

export const AppContext = createContext<AppContextValue>(defaultValue);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pendingAuth, setPendingAuth] = useState<PendingAuthState | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await authStorage.getSession();
        const token = session.token ?? null;
        const user = session.user;

        if (token && user) {
          try {
            const refreshedUser = await userAuthApi.refreshUserProfile(token, user);
            await authStorage.setSession(token, refreshedUser);
            setAuthToken(token);
            setCurrentUser(refreshedUser);
            return;
          } catch {
            // Fall back to cached session when profile APIs are unavailable.
          }
        }

        setAuthToken(token);
        setCurrentUser(user);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      authToken,
      currentUser,
      isAuthenticated: Boolean(authToken?.trim()),
      isBootstrapping,
      pendingAuth,
      setPendingAuth,
      setSession: async (token, user) => {
        await authStorage.setSession(token, user);
        setAuthToken(token);
        setCurrentUser(user);
        setPendingAuth(null);
      },
      clearSession: async () => {
        await authStorage.clearSession();
        setAuthToken(null);
        setCurrentUser(null);
        setPendingAuth(null);
      },
    }),
    [authToken, currentUser, isBootstrapping, pendingAuth],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
