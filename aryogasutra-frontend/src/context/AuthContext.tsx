import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Role = "PATIENT" | "DOCTOR" | "ADMIN";

type AuthState = {
  token: string | null;
  role: Role | null;
  email: string | null;
  userId: string | null;
  profileId: string | null;
};

const AuthContext = createContext<{
  auth: AuthState;
  setAuth: (a: Partial<AuthState>) => void;
  logout: () => void;
} | null>(null);

const STORAGE_KEY = "aryoga_auth";

function load(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        token: null,
        role: null,
        email: null,
        userId: null,
        profileId: null,
      };
    }
    return JSON.parse(raw) as AuthState;
  } catch {
    return {
      token: null,
      role: null,
      email: null,
      userId: null,
      profileId: null,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(() => load());

  const setAuth = useCallback((patch: Partial<AuthState>) => {
    setAuthState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (patch.token !== undefined) {
        if (patch.token) localStorage.setItem("aryoga_token", patch.token);
        else localStorage.removeItem("aryoga_token");
      }
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("aryoga_token");
    setAuthState({
      token: null,
      role: null,
      email: null,
      userId: null,
      profileId: null,
    });
  }, []);

  const value = useMemo(() => ({ auth, setAuth, logout }), [auth, setAuth, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
