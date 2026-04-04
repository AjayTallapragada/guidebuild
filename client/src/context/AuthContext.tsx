import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiClient } from "../services/apiClient";
import { clearTokens, getRefreshToken, setTokens } from "../services/storage";
import { AuthTokens, UserProfile } from "../types";

type AuthContextValue = {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function applyTokensAndFetchUser(tokens: AuthTokens): Promise<UserProfile> {
  setTokens(tokens.accessToken, tokens.refreshToken);
  const response = await apiClient.get<UserProfile>("/auth/me");
  return response.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const tokenResponse = await apiClient.post<AuthTokens>("/auth/refresh", { refreshToken });
        const profile = await applyTokensAndFetchUser(tokenResponse.data);
        setUser(profile);
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      async login(payload) {
        const tokenResponse = await apiClient.post<AuthTokens>("/auth/login", payload);
        const profile = await applyTokensAndFetchUser(tokenResponse.data);
        setUser(profile);
      },
      async register(payload) {
        const tokenResponse = await apiClient.post<AuthTokens>("/auth/register", payload);
        const profile = await applyTokensAndFetchUser(tokenResponse.data);
        setUser(profile);
      },
      async logout() {
        try {
          await apiClient.post("/auth/logout");
        } finally {
          clearTokens();
          setUser(null);
        }
      }
    }),
    [isBootstrapping, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
