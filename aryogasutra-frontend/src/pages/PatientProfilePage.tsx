import { useEffect, useState } from "react";
import { api } from "../api/client";

type Patient = {
  id: number;
  name?: string;
  age?: number;
  gender?: string;
  symptoms?: string;
  disease?: string;
  dosha?: string;
  medicalHistory?: string;
  reportFilePath?: string;
  lastAiDisease?: string;
  lastAiRemedy?: string;
  lastAiYoga?: string;
  lastAiAt?: string;
};

type Suggestion = {
  id: number;
  doctorName?: string;
  suggestionText?: string;
  createdAt?: string;
};

const DOSHA_PILL: Record<string, string> = {
  Vata: "bg-blue-100 text-blue-700 border-blue-200",
  Pitta: "bg-red-100 text-red-700 border-red-200",
  Kapha: "bg-green-100 text-green-700 border-green-200",
};

export default function PatientProfilePage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [form, setForm] = useState<Partial<Patient>>({});
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Patient>("/patients/me");
      setPatient(data);
      setForm(data);
      // Load suggestions for this patient
      if (data.id) {
        const sugRes = await api.get<Suggestion[]>(`/suggestions/patient/${data.id}`);
        setSuggestions(sugRes.data);
      }
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Failed to load profile", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await api.put("/patients/me", {
        name: form.name,
        age: form.age,
        gender: form.gender,
        symptoms: form.symptoms,
        disease: form.disease,
        dosha: form.dosha,
        medicalHistory: form.medicalHistory,
      });
      setMsg({ text: "Profile saved successfully.", type: "success" });
      load();
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Save failed", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setMsg(null);
    try {
      await api.post("/patients/me/report", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg({ text: "Report uploaded successfully.", type: "success" });
      load();
    } catch (err) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Upload failed", type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-ayur-moss border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12 text-stone-500">
        Could not load profile. Please try again.
      </div>
    );
  }

  const doshaPill = patient.dosha ? DOSHA_PILL[patient.dosha] : null;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ayur-leaf">My Profile</h2>
        {patient.dosha && doshaPill && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full border ${doshaPill}`}>
            {patient.dosha} Dosha
          </span>
        )}
      </div>

      {/* Feedback */}
      {msg && (
        <div
          className={`rounded-lg px-3 py-2 text-sm border ${
            msg.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Edit form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <form className="space-y-3" onSubmit={save}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Full name</label>
              <input
                className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Age</label>
              <input
                type="number"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                value={form.age ?? ""}
                onChange={(e) =>
                  setForm({ ...form, age: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Gender</label>
              <select
                className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                value={form.gender ?? ""}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Dosha</label>
              <select
                className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                value={form.dosha ?? ""}
                onChange={(e) => setForm({ ...form, dosha: e.target.value })}
              >
                <option value="">Not set</option>
                <option>Vata</option>
                <option>Pitta</option>
                <option>Kapha</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Symptoms</label>
            <textarea
              className="w-full border border-stone-300 rounded-lg px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ayur-moss"
              value={form.symptoms ?? ""}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              placeholder="Describe your current symptoms"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Medical history</label>
            <textarea
              className="w-full border border-stone-300 rounded-lg px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ayur-moss"
              value={form.medicalHistory ?? ""}
              onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
              placeholder="Past conditions, medications, allergies…"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-lg bg-ayur-moss text-white font-semibold hover:bg-ayur-leaf transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </div>

      {/* My reported problems — visible summary */}
      {(patient.symptoms || patient.disease || patient.medicalHistory) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-amber-800">🩺 My Reported Health Info</h3>
          {patient.symptoms && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">Current Symptoms / Problem:</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{patient.symptoms}</p>
            </div>
          )}
          {patient.disease && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">Diagnosed Condition:</p>
              <p className="text-sm text-amber-900">{patient.disease}</p>
            </div>
          )}
          {patient.medicalHistory && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">Medical History:</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{patient.medicalHistory}</p>
            </div>
          )}
        </div>
      )}

      {/* AI snapshot */}
      {patient.lastAiDisease && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <h3 className="font-semibold text-ayur-leaf">Last AI Snapshot</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-stone-400 w-24 shrink-0">Condition</span>
              <span className="text-stone-800 font-medium">{patient.lastAiDisease}</span>
            </div>
            {patient.lastAiRemedy && (
              <div className="flex gap-2">
                <span className="text-stone-400 w-24 shrink-0">Remedy</span>
                <span className="text-stone-700">{patient.lastAiRemedy}</span>
              </div>
            )}
            {patient.lastAiYoga && (
              <div className="flex gap-2">
                <span className="text-stone-400 w-24 shrink-0">Yoga</span>
                <span className="text-stone-700">{patient.lastAiYoga}</span>
              </div>
            )}
            {patient.lastAiAt && (
              <p className="text-xs text-stone-400">
                Last updated: {new Date(patient.lastAiAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Doctor suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <h3 className="font-semibold text-ayur-leaf">Doctor Suggestions</h3>
          <div className="space-y-3">
            {suggestions.map((sug) => (
              <div key={sug.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-emerald-800">
                    🩺 Dr. {sug.doctorName ?? "Unknown"}
                  </p>
                  {sug.createdAt && (
                    <p className="text-xs text-emerald-600">
                      {new Date(sug.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <p className="text-sm text-emerald-900 whitespace-pre-wrap">
                  {sug.suggestionText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File upload */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
        <h3 className="font-semibold text-stone-700">Upload Report</h3>
        <p className="text-xs text-stone-400">Max 8 MB. Stored on the server.</p>
        <input type="file" onChange={upload} className="text-sm" />
        {patient.reportFilePath && (
          <p className="text-xs text-stone-500 break-all">
            Stored: {patient.reportFilePath}
          </p>
        )}
      </div>
    </div>
  );
}
