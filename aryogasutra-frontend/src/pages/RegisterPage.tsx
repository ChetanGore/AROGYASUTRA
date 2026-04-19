import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { setAuth } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"PATIENT" | "DOCTOR" | "ADMIN">("PATIENT");
  const [spec, setSpec] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const body: Record<string, unknown> = {
      email,
      password,
      name,
      role,
      specialization: role === "DOCTOR" ? spec : undefined,
      latitude: role === "DOCTOR" && lat ? Number(lat) : undefined,
      longitude: role === "DOCTOR" && lng ? Number(lng) : undefined,
    };
    try {
      const { data } = await api.post("/auth/register", body);
      setAuth({
        token: data.token,
        role: data.role,
        email: data.email,
        userId: String(data.userId),
        profileId: data.profileId != null ? String(data.profileId) : null,
      });
      nav("/dashboard");
    } catch (ex: unknown) {
      const ax = ex as { response?: { data?: { message?: string } }; message?: string };
      setErr(ax.response?.data?.message ?? ax.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow border border-stone-200 p-6 space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-ayur-leaf">Create account</h2>
        <p className="text-sm text-stone-500">Join AryogaSutra — your Ayurvedic health companion</p>
      </div>

      {/* Error */}
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <form className="space-y-3" onSubmit={submit}>
        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">I am a…</label>
          <div className="flex gap-2">
            {(["PATIENT", "DOCTOR"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                  role === r
                    ? "bg-ayur-moss text-white border-ayur-moss"
                    : "border-stone-300 text-stone-700 hover:bg-stone-50"
                }`}
              >
                {r === "PATIENT" ? "🧘 Patient" : "👨‍⚕️ Doctor"}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Full name</label>
          <input
            className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        {/* Doctor-only fields */}
        {role === "DOCTOR" && (
          <>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Specialization</label>
              <input
                className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                placeholder="e.g. Ayurveda, General Medicine"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Latitude</label>
                <input
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  placeholder="e.g. 28.61"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Longitude</label>
                <input
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  placeholder="e.g. 77.20"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
          <input
            className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
          <input
            className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="text-xs text-stone-400 mt-1">Minimum 8 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-ayur-moss text-white font-semibold hover:bg-ayur-leaf transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-stone-500 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-ayur-moss font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
