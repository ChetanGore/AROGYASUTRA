import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Doctor = { id: number; name?: string; specialization?: string };

export default function DashboardPage() {
  const { auth } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [docId, setDocId] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [apptMsg, setApptMsg] = useState<string | null>(null);

  useEffect(() => {
    if (auth.role !== "PATIENT") return;
    api
      .get<Doctor[]>("/doctors")
      .then((r) => setDoctors(r.data))
      .catch(() => {});
  }, [auth.role]);

  async function bookAppt(e: React.FormEvent) {
    e.preventDefault();
    setApptMsg(null);
    if (!when) return;
    const iso = new Date(when).toISOString().slice(0, 19);
    try {
      await api.post("/appointments", {
        doctorId: Number(docId),
        appointmentDate: iso,
        notes: note || null,
      });
      setApptMsg("Appointment booked.");
    } catch (e) {
      setApptMsg(String(e));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ayur-leaf">Dashboard</h1>
      <p className="text-stone-600">
        Signed in as <span className="font-medium">{auth.email ?? "OAuth user"}</span> — role{" "}
        <span className="font-mono text-sm bg-stone-200 px-2 py-0.5 rounded">{auth.role}</span>
      </p>
      {auth.role === "PATIENT" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 max-w-lg">
          <h3 className="font-semibold text-ayur-leaf mb-2">Book appointment</h3>
          <form className="space-y-2 text-sm" onSubmit={bookAppt}>
            <select
              className="w-full border rounded-lg px-2 py-1"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              required
            >
              <option value="">Select doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialization}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              className="w-full border rounded-lg px-2 py-1"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
            <input
              className="w-full border rounded-lg px-2 py-1"
              placeholder="Notes (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button type="submit" className="px-3 py-1 rounded-lg bg-ayur-moss text-white text-sm">
              Book
            </button>
          </form>
          {apptMsg && <p className="text-xs mt-2 text-stone-600">{apptMsg}</p>}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {auth.role === "PATIENT" && (
          <>
            <DashboardCard title="Profile & history" to="/patient" desc="Symptoms, dosha, uploads" />
            <DashboardCard title="Dosha questionnaire" to="/dosha" desc="Score Vata · Pitta · Kapha" />
            <DashboardCard title="Nearby doctors" to="/nearby" desc="Geolocation + Haversine top 3" />
            <DashboardCard title="AI insights" to="/ai" desc="ML disease / remedy / yoga" />
            <DashboardCard title="PDF report" to="/report" desc="Download consolidated summary" />
          </>
        )}
        {(auth.role === "DOCTOR" || auth.role === "ADMIN") && (
          <DashboardCard title="Doctor / admin panel" to="/doctor" desc="Patients, suggestions, AI" />
        )}
        <DashboardCard title="AI (all roles)" to="/ai" desc="Run ML prediction" />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  to,
  desc,
}: {
  title: string;
  to: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-stone-200 bg-ayur-sand/40 p-4 hover:shadow-md transition"
    >
      <h3 className="font-semibold text-ayur-leaf">{title}</h3>
      <p className="text-sm text-stone-600 mt-1">{desc}</p>
    </Link>
  );
}
