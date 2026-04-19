import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Appointment = {
  id: number;
  patientId?: number;
  patientName?: string;
  doctorId?: number;
  doctorName?: string;
  appointmentDate?: string;
  status?: string;
  notes?: string;
  preProcedureNotes?: string;
  postProcedureNotes?: string;
  treatmentActive?: boolean;
};

const STATUS_BADGE: Record<string, string> = {
  BOOKED: "bg-green-100 text-green-700 border-green-200",
  RESCHEDULED: "bg-blue-100 text-blue-700 border-blue-200",
  CANCELLED: "bg-stone-100 text-stone-500 border-stone-200",
};

const STATUS_ICON: Record<string, string> = {
  BOOKED: "✅",
  RESCHEDULED: "🔄",
  CANCELLED: "❌",
};

export default function AppointmentsPage() {
  const { auth } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [treatmentId, setTreatmentId] = useState<number | null>(null);
  const [preNotes, setPreNotes] = useState("");
  const [postNotes, setPostNotes] = useState("");
  const [treatmentActive, setTreatmentActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "active">("upcoming");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Appointment[]>("/appointments");
      setAppointments(data);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Failed to load appointments", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function cancel(id: number) {
    if (!window.confirm("Cancel this appointment?")) return;
    setMsg(null);
    try {
      await api.put(`/appointments/${id}/cancel`);
      setMsg({ text: "Appointment cancelled. Notification sent.", type: "success" });
      load();
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Cancel failed", type: "error" });
    }
  }

  async function reschedule(id: number) {
    if (!rescheduleDate) return;
    setMsg(null);
    try {
      const iso = new Date(rescheduleDate).toISOString().slice(0, 19);
      await api.put(`/appointments/${id}/reschedule`, { appointmentDate: iso });
      setMsg({ text: "Appointment rescheduled. Notification sent.", type: "success" });
      setRescheduleId(null);
      setRescheduleDate("");
      load();
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setMsg({ text: ax.response?.data?.message ?? ax.message ?? "Reschedule failed", type: "error" });
    }
  }

  async function saveTreatmentNotes(id: number) {
    setMsg(null);
    try {
      await api.put(`/appointments/${id}/treatment-notes`, {
        preProcedureNotes: preNotes,
        postProcedureNotes: postNotes,
        treatmentActive,
      });
      setMsg({
        text: treatmentActive
          ? "Treatment notes saved. Reminder sent to patient."
          : "Treatment notes saved.",
        type: "success",
      });
      setTreatmentId(null);
      load();
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

  const now = new Date();
  const filtered = appointments.filter((a) => {
    const date = a.appointmentDate ? new Date(a.appointmentDate) : null;
    if (activeTab === "upcoming") return date && date >= now && a.status !== "CANCELLED";
    if (activeTab === "past") return (date && date < now) || a.status === "CANCELLED";
    if (activeTab === "active") return a.treatmentActive;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-ayur-moss border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ayur-leaf">Appointments</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {auth.role === "DOCTOR" ? "Manage your patient appointments" : "Your scheduled appointments"}
          </p>
        </div>
        <span className="text-sm bg-ayur-moss/10 text-ayur-moss px-3 py-1 rounded-full font-medium">
          {appointments.length} total
        </span>
      </div>

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

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
        {(["upcoming", "past", "active"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? "bg-white text-ayur-leaf shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab === "upcoming" ? "📅 Upcoming" : tab === "past" ? "🕐 Past" : "🌿 Active Treatment"}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <p className="text-stone-400 text-sm">
            {activeTab === "upcoming"
              ? "No upcoming appointments."
              : activeTab === "active"
              ? "No active treatments."
              : "No past appointments."}
          </p>
          {activeTab === "upcoming" && (
            <p className="text-stone-400 text-xs mt-1">
              Book one from the Nearby Doctors page.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-stone-800">
                    {auth.role === "DOCTOR"
                      ? `Patient: ${a.patientName ?? "Unknown"}`
                      : `Dr. ${a.doctorName ?? "Unknown"}`}
                  </p>
                  <p className="text-sm text-stone-500">
                    {a.appointmentDate
                      ? new Date(a.appointmentDate).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Date not set"}
                  </p>
                  {a.notes && (
                    <p className="text-xs text-stone-400 mt-1">📝 {a.notes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                    STATUS_BADGE[a.status ?? ""] ?? "bg-stone-100 text-stone-500 border-stone-200"
                  }`}>
                    {STATUS_ICON[a.status ?? ""]} {a.status ?? "—"}
                  </span>
                  {a.treatmentActive && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      🌿 Treatment Active
                    </span>
                  )}
                </div>
              </div>

              {/* Treatment notes display (patient view) */}
              {auth.role === "PATIENT" && (a.preProcedureNotes || a.postProcedureNotes) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-emerald-800">🌿 Treatment Instructions from Doctor</p>
                  {a.preProcedureNotes && (
                    <div>
                      <p className="text-xs font-medium text-emerald-700">Before Procedure:</p>
                      <p className="text-xs text-emerald-900 mt-0.5 whitespace-pre-wrap">{a.preProcedureNotes}</p>
                    </div>
                  )}
                  {a.postProcedureNotes && (
                    <div>
                      <p className="text-xs font-medium text-emerald-700">After Procedure:</p>
                      <p className="text-xs text-emerald-900 mt-0.5 whitespace-pre-wrap">{a.postProcedureNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {a.status !== "CANCELLED" && (
                <div className="flex flex-wrap gap-2">
                  {auth.role === "PATIENT" && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setRescheduleId(a.id); setRescheduleDate(""); }}
                        className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 text-sm hover:bg-blue-50 transition"
                      >
                        🔄 Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => cancel(a.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
                      >
                        ❌ Cancel
                      </button>
                    </>
                  )}
                  {auth.role === "DOCTOR" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openTreatmentEditor(a)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50 transition"
                      >
                        🌿 Treatment Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => cancel(a.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
                      >
                        ❌ Cancel
                      </button>
                    </>
                  )}
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
                      onClick={() => reschedule(a.id)}
                      disabled={!rescheduleDate}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setRescheduleId(null)}
                      className="px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Treatment notes editor (doctor only) */}
              {treatmentId === a.id && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-3">
                  <p className="text-sm font-semibold text-emerald-800">🌿 Treatment Instructions</p>
                  <div>
                    <label className="block text-xs font-medium text-emerald-700 mb-1">
                      Pre-Procedure Instructions
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      placeholder="e.g. Fast for 4 hours before treatment, avoid spicy food..."
                      value={preNotes}
                      onChange={(e) => setPreNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-700 mb-1">
                      Post-Procedure Instructions
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      placeholder="e.g. Rest for 30 minutes, drink warm water, avoid cold food for 24 hours..."
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
                    <span className="text-sm text-emerald-800">
                      Mark treatment as active (sends reminder email to patient)
                    </span>
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
                      className="px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
