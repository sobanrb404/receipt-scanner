import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { api, getToken, setToken, clearToken } from "../api/client";
import type { AuthResponse } from "../api/types";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  signup: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getToken()));

  const login = useCallback(async (email: string, password: string, remember = true) => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    setToken(res.access_token, remember);
    setIsAuthenticated(true);
  }, []);

  const signup = useCallback(async (email: string, password: string, remember = true) => {
    await api.post("/auth/signup", { email, password });
    // Signup doesn't return a token, so log in right after for a smooth flow.
    await login(email, password, remember);
  }, [login]);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
