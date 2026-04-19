import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

/** Decode a JWT payload without a library (base64url → JSON). */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Backend redirects here with ?token=JWT after OAuth2 success. */
export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { setAuth } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    const error = params.get("error");
    if (error) {
      nav("/login?error=oauth_failed", { replace: true });
      return;
    }

    const token = params.get("token");
    if (!token) {
      nav("/login", { replace: true });
      return;
    }

    // Decode JWT to extract role, uid, sub (email)
    const payload = decodeJwtPayload(token);
    const role = (payload.role as string) ?? "PATIENT";
    const userId = payload.uid != null ? String(payload.uid) : null;
    const email = (payload.sub as string) ?? null;

    // Store token immediately so API calls work
    localStorage.setItem("aryoga_token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    // Fetch profile id based on role
    const profileEndpoint = role === "DOCTOR" ? "/doctors/me" : "/patients/me";
    api
      .get<{ id: number }>(profileEndpoint)
      .then((r) => {
        setAuth({
          token,
          role: role as "PATIENT" | "DOCTOR" | "ADMIN",
          email,
          userId,
          profileId: String(r.data.id),
        });
        nav("/dashboard", { replace: true });
      })
      .catch(() => {
        // Profile fetch failed — still store auth and redirect
        setAuth({
          token,
          role: role as "PATIENT" | "DOCTOR" | "ADMIN",
          email,
          userId,
          profileId: null,
        });
        nav("/dashboard", { replace: true });
      });
  }, [params, nav, setAuth]);

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-ayur-moss border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-600">Completing sign-in…</p>
      </div>
    </div>
  );
}
