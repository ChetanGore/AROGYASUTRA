import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Patient = {
  id: number;
  name?: string;
  disease?: string;
  dosha?: string;
  symptoms?: string;
  medicalHistory?: string;
  age?: number;
  gender?: string;
  lastAiDisease?: string;
  lastAiRemedy?: string;
  reportFilePath?: string;
};

type Appointment = {
  id: number;
  patientId?: number;
  patientName?: string;
  doctorName?: string;
  appointmentDate?: string;
  status?: string;
  notes?: string;
  preProcedureNotes?: string;
  postProcedureNotes?: string;
  treatmentActive?: boolean;
};

type Suggestion = {
  id: number;
  doctorName?: string;
  patientName?: string;
  suggestionText?: string;
  createdAt?: string;
};

const STATUS_BADGE: Record<string, string> = {
  BOOKED: "bg-green-100 text-green-700",
  RESCHEDULED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-stone-100 text-stone-500",
};

export default function DoctorPanelPage() {
  const { auth } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [mySuggestions, setMySuggestions] = useState<Suggestion[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pid, setPid] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [treatmentId, setTreatmentId] = useState<number | null>(null);
  const [preNotes, setPreNotes] = useState("");
  const [postNotes, setPostNotes] = useState("");
  const [treatmentActive, setTreatmentActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"patients" | "appointments" | "suggestions">("patients");

  async function refresh() {
    try {
      const [pRes, aRes] = await Promise.all([
        api.get<Patient[]>("/patients"),
        api.get<Appointment[]>("/appointments"),
      ]);
      setPatients(pRes.data);
      setAppointments(aRes.data);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Failed to load data", type: "error" });
    }
  }

  async function loadSuggestionsForPatient(patientId: number) {
    try {
      const res = await api.get<Suggestion[]>(`/suggestions/patient/${patientId}`);
      setMySuggestions(res.data);
    } catch {
      setMySuggestions([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function selectPatient(p: Patient) {
    setSelectedPatient(p);
    setPid(String(p.id));
    loadSuggestionsForPatient(p.id);
  }

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post("/suggestions", {
        patientId: Number(pid),
        suggestionText,
      });
      setMsg({ text: "Suggestion saved and visible to patient.", type: "success" });
      setSuggestionText("");
      if (selectedPatient) loadSuggestionsForPatient(selectedPatient.id);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Failed to save suggestion", type: "error" });
    }
  }

  async function saveLocation(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.put("/doctors/me", {
        latitude: lat ? Number(lat) : undefined,
        longitude: lng ? Number(lng) : undefined,
      });
      setMsg({ text: "Location updated.", type: "success" });
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Failed to update location", type: "error" });
    }
  }

  async function cancelAppointment(id: number) {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      setMsg({ text: "Appointment cancelled.", type: "success" });
      refresh();
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Cancel failed", type: "error" });
    }
  }

  async function rescheduleAppointment(id: number) {
    if (!rescheduleDate) return;
    try {
      const iso = new Date(rescheduleDate).toISOString().slice(0, 19);
      await api.put(`/appointments/${id}/reschedule`, { appointmentDate: iso });
      setMsg({ text: "Appointment rescheduled.", type: "success" });
      setRescheduleId(null);
      setRescheduleDate("");
      refresh();
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Reschedule failed", type: "error" });
    }
  }

  async function saveTreatmentNotes(id: number) {
    try {
      await api.put(`/appointments/${id}/treatment-notes`, {
        preProcedureNotes: preNotes,
        postProcedureNotes: postNotes,
        treatmentActive,
      });
      setMsg({ text: "Treatment notes saved. Patient can now see them.", type: "success" });
      setTreatmentId(null);
      refresh();
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Save failed", type: "error" });
    }
  }

  function openTreatmentEditor(a: Appointment) {
    setTreatmentId(a.id);
    setPreNotes(a.preProcedureNotes ?? "");
    setPostNotes(a.postProcedureNotes ?? "");
    setTreatmentActive(a.treatmentActive ?? false);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-ayur-leaf">
        {auth.role === "ADMIN" ? "Admin Panel" : "Doctor Panel"}
      </h2>

      {/* Feedback */}
      {msg && (
        <div className={`rounded-lg px-3 py-2 text-sm border ${
          msg.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Location update */}
      {auth.role === "DOCTOR" && (
        <section className="bg-white rounded-2xl border border-stone-200 p-4">
          <h3 className="font-semibold text-stone-700 mb-3">📍 My Practice Location</h3>
          <form onSubmit={saveLocation} className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Latitude</label>
              <input
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                placeholder="e.g. 28.61"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Longitude</label>
              <input
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                placeholder="e.g. 77.20"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-ayur-moss text-white text-sm font-medium hover:bg-ayur-leaf transition">
              Save location
            </button>
          </form>
        </section>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
        {(["patients", "appointments", "suggestions"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab ? "bg-white text-ayur-leaf shadow-sm" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab === "patients" ? `👥 Patients (${patients.length})` :
             tab === "appointments" ? `📅 Appointments (${appointments.length})` :
             "💬 Add Suggestion"}
          </button>
        ))}
      </div>

      {/* PATIENTS TAB */}
      {activeTab === "patients" && (
        <section className="space-y-3">
          {patients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
              No patients found.
            </div>
          ) : (
            patients.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
                {/* Patient header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-stone-800">{p.name ?? "Unknown"}</p>
                    <p className="text-xs text-stone-400">
                      ID: {p.id}
                      {p.age ? ` · Age: ${p.age}` : ""}
                      {p.gender ? ` · ${p.gender}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {p.dosha && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {p.dosha}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => { selectPatient(p); setActiveTab("suggestions"); }}
                      className="text-xs px-3 py-1 rounded-lg bg-ayur-moss text-white hover:bg-ayur-leaf transition"
                    >
                      + Suggest
                    </button>
                  </div>
                </div>

                {/* Patient's reported problem / symptoms */}
                {p.symptoms && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-1">🩺 Patient's Reported Problem:</p>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{p.symptoms}</p>
                  </div>
                )}

                {/* Medical history */}
                {p.medicalHistory && (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-stone-600 mb-1">📋 Medical History:</p>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{p.medicalHistory}</p>
                  </div>
                )}

                {/* Patient uploaded report */}
                {p.reportFilePath && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-800 mb-0.5">📎 Patient Uploaded Report</p>
                      <p className="text-xs text-blue-600 break-all">{p.reportFilePath.split(/[\\/]/).pop()}</p>
                    </div>
                    <a
                      href={`http://localhost:8080/patients/${p.id}/report`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition whitespace-nowrap"
                    >
                      View File
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* APPOINTMENTS TAB */}
      {activeTab === "appointments" && (
        <section className="space-y-3">
          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
              No appointments found.
            </div>
          ) : (
            appointments.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-stone-800">Patient: {a.patientName ?? "—"}</p>
                    <p className="text-sm text-stone-500">
                      {a.appointmentDate
                        ? new Date(a.appointmentDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                        : "Date not set"}
                    </p>
                    {a.notes && <p className="text-xs text-stone-400 mt-1">📝 {a.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status ?? ""] ?? "bg-stone-100 text-stone-500"}`}>
                      {a.status ?? "—"}
                    </span>
                    {a.treatmentActive && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        🌿 Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Show existing treatment notes */}
                {(a.preProcedureNotes || a.postProcedureNotes) && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-semibold text-emerald-800">Current Treatment Instructions (visible to patient):</p>
                    {a.preProcedureNotes && (
                      <p className="text-xs text-emerald-900"><span className="font-medium">Before:</span> {a.preProcedureNotes}</p>
                    )}
                    {a.postProcedureNotes && (
                      <p className="text-xs text-emerald-900"><span className="font-medium">After:</span> {a.postProcedureNotes}</p>
                    )}
                  </div>
                )}

                {a.status !== "CANCELLED" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openTreatmentEditor(a)}
                      className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50 transition"
                    >
                      🌿 Treatment Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRescheduleId(a.id); setRescheduleDate(""); }}
                      className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 text-sm hover:bg-blue-50 transition"
                    >
                      🔄 Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelAppointment(a.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                )}

                {/* Reschedule picker */}
                {rescheduleId === a.id && (
                  <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-medium text-blue-700">Select new date & time:</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="datetime-local"
                        className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => rescheduleAppointment(a.id)}
                        disabled={!rescheduleDate}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setRescheduleId(null)}
                        className="px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Treatment notes editor */}
                {treatmentId === a.id && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-3">
                    <p className="text-sm font-semibold text-emerald-800">🌿 Treatment Instructions (patient will see these)</p>
                    <div>
                      <label className="block text-xs font-medium text-emerald-700 mb-1">Pre-Procedure Instructions</label>
                      <textarea
                        rows={3}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                        placeholder="e.g. Fast for 4 hours before treatment, avoid spicy food..."
                        value={preNotes}
                        onChange={(e) => setPreNotes(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-emerald-700 mb-1">Post-Procedure Instructions</label>
                      <textarea
                        rows={3}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                        placeholder="e.g. Rest for 30 minutes, drink warm water..."
                        value={postNotes}
                        onChange={(e) => setPostNotes(e.target.value)}
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={treatmentActive}
                        onChange={(e) => setTreatmentActive(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span className="text-sm text-emerald-800">Mark treatment as active</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveTreatmentNotes(a.id)}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
                      >
                        Save & Notify Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => setTreatmentId(null)}
                        className="px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* SUGGESTIONS TAB */}
      {activeTab === "suggestions" && auth.role === "DOCTOR" && (
        <section className="space-y-4">
          {/* Patient selector */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
            <h3 className="font-semibold text-stone-700">Select Patient</h3>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {patients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPatient(p)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition ${
                    selectedPatient?.id === p.id
                      ? "border-ayur-moss bg-ayur-moss/10 text-ayur-leaf font-medium"
                      : "border-stone-200 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <span className="font-medium">{p.name ?? "Unknown"}</span>
                  <span className="text-stone-400 ml-2">ID: {p.id}</span>
                  {p.dosha && <span className="ml-2 text-xs text-emerald-600">{p.dosha}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Selected patient's problem */}
          {selectedPatient && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-800">
                🩺 {selectedPatient.name}'s Reported Problem:
              </p>
              {selectedPatient.symptoms ? (
                <p className="text-sm text-amber-900 whitespace-pre-wrap">{selectedPatient.symptoms}</p>
              ) : (
                <p className="text-sm text-amber-600 italic">No symptoms reported yet.</p>
              )}
              {selectedPatient.lastAiDisease && (
                <p className="text-xs text-amber-700 mt-1">
                  🤖 AI: <span className="font-medium">{selectedPatient.lastAiDisease}</span>
                  {selectedPatient.lastAiRemedy && ` — ${selectedPatient.lastAiRemedy}`}
                </p>
              )}
            </div>
          )}

          {/* Suggestion form */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
            <h3 className="font-semibold text-stone-700">
              Add Treatment Suggestion
              {selectedPatient && <span className="text-ayur-moss ml-2">for {selectedPatient.name}</span>}
            </h3>
            <form onSubmit={submitSuggestion} className="space-y-3">
              {!selectedPatient && (
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Patient ID (or select above)</label>
                  <input
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                    placeholder="Enter patient ID"
                    value={pid}
                    onChange={(e) => setPid(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-stone-500 mb-1">Suggestion / Treatment Plan</label>
                <textarea
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 min-h-[100px] text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss resize-none"
                  placeholder="Treatment plan, lifestyle advice, herbal remedies, follow-up instructions…"
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!pid && !selectedPatient}
                className="w-full py-2 rounded-lg bg-ayur-moss text-white text-sm font-medium hover:bg-ayur-leaf transition disabled:opacity-50"
              >
                ✅ Submit Suggestion (visible to patient)
              </button>
            </form>
          </div>

          {/* Previous suggestions for selected patient */}
          {selectedPatient && mySuggestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
              <h3 className="font-semibold text-stone-700">Previous Suggestions for {selectedPatient.name}</h3>
              <div className="space-y-2">
                {mySuggestions.map((sug) => (
                  <div key={sug.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-emerald-700">Dr. {sug.doctorName}</p>
                      {sug.createdAt && (
                        <p className="text-xs text-emerald-600">{new Date(sug.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    <p className="text-sm text-emerald-900 whitespace-pre-wrap">{sug.suggestionText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
