import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Prediction = {
  disease?: string;
  remedy?: string;
  yoga?: string;
  confidence?: number;
};

type Suggestion = {
  id: number;
  suggestionText?: string;
  createdAt?: string;
  doctorName?: string;
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const DIET_TYPES = ["Vegetarian", "Vegan", "Non-Vegetarian", "Eggetarian", "Jain"];
const LIFESTYLE = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];
const CHRONIC_CONDITIONS = [
  "Diabetes", "Hypertension", "Asthma", "Arthritis", "Thyroid",
  "Heart Disease", "Kidney Disease", "Liver Disease", "None",
];
const SEVERITY = ["Mild", "Moderate", "Severe"];

const DOSHA_INFO: Record<string, { color: string; desc: string }> = {
  Vata: { color: "bg-blue-50 border-blue-200 text-blue-800", desc: "Air & Space — governs movement, creativity, and nervous system" },
  Pitta: { color: "bg-red-50 border-red-200 text-red-800", desc: "Fire & Water — governs digestion, metabolism, and intelligence" },
  Kapha: { color: "bg-green-50 border-green-200 text-green-800", desc: "Earth & Water — governs structure, immunity, and stability" },
};

export default function AiPage() {
  const { auth } = useAuth();

  // Core fields
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState(30);
  const [dosha, setDosha] = useState("Vata");
  const [severity, setSeverity] = useState("Moderate");
  const [duration, setDuration] = useState("");

  // Extended fields
  const [bloodGroup, setBloodGroup] = useState("Unknown");
  const [diet, setDiet] = useState("Vegetarian");
  const [lifestyle, setLifestyle] = useState("Moderately Active");
  const [chronicConditions, setChronicConditions] = useState<string[]>(["None"]);
  const [allergies, setAllergies] = useState("");
  const [currentMeds, setCurrentMeds] = useState("");
  const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState(5);
  const [waterIntake, setWaterIntake] = useState(2);
  const [gender, setGender] = useState("Male");

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-fill from patient profile
  useEffect(() => {
    if (auth.role !== "PATIENT") { setPrefilling(false); return; }
    api.get<{ symptoms?: string; age?: number; dosha?: string; gender?: string }>("/patients/me")
      .then((r) => {
        if (r.data.symptoms) setSymptoms(r.data.symptoms);
        if (r.data.age) setAge(r.data.age);
        if (r.data.dosha) setDosha(r.data.dosha);
        if (r.data.gender) setGender(r.data.gender);
      })
      .catch(() => {})
      .finally(() => setPrefilling(false));
  }, [auth.role]);

  function toggleChronic(c: string) {
    if (c === "None") { setChronicConditions(["None"]); return; }
    setChronicConditions(prev => {
      const without = prev.filter(x => x !== "None");
      return without.includes(c) ? without.filter(x => x !== c) || ["None"] : [...without, c];
    });
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true); setPrediction(null); setSuggestions([]); setSaved(false);
    try {
      const { data } = await api.post<Prediction>("/predict", { symptoms, age, dosha });
      setPrediction(data);

      // Save snapshot to patient profile
      if (auth.role === "PATIENT" && auth.profileId) {
        try {
          await api.put("/patients/me", {
            symptoms,
            age,
            dosha,
            gender,
            lastAiDisease: data.disease,
            lastAiRemedy: data.remedy,
            lastAiYoga: data.yoga,
          });
          setSaved(true);
        } catch { /* non-critical */ }

        api.get<Suggestion[]>(`/suggestions/patient/${auth.profileId}`)
          .then((r) => setSuggestions(r.data))
          .catch(() => {});
      }
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setErr(ax.response?.data?.message ?? ax.message ?? "Prediction failed");
    } finally { setLoading(false); }
  }

  const confidencePct = prediction?.confidence != null ? Math.round(prediction.confidence * 100) : null;
  const doshaInfo = DOSHA_INFO[dosha];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-ayur-leaf">🤖 AI Health Insights</h2>
        <p className="text-sm text-stone-500 mt-1">
          Powered by a Random Forest model trained on Ayurvedic data. Fill in your details for a personalised analysis.
        </p>
      </div>

      {/* Main form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
        {prefilling && (
          <p className="text-xs text-stone-400 flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-ayur-moss border-t-transparent rounded-full animate-spin inline-block" />
            Loading your profile…
          </p>
        )}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{err}</div>
        )}

        <form className="space-y-5" onSubmit={run}>
          {/* Section 1: Core */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide border-b border-stone-100 pb-2">
              🩺 Core Health Info
            </h3>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Symptoms <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-stone-300 rounded-xl px-3 py-2 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-ayur-moss resize-none"
                placeholder="Describe your symptoms in detail (e.g. persistent headache, fatigue, joint pain, bloating…)"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Age</label>
                <input type="number" min={0} max={120}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  value={age} onChange={(e) => setAge(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Gender</label>
                <select className="w-full border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Symptom Severity</label>
                <div className="flex gap-1">
                  {SEVERITY.map(s => (
                    <button key={s} type="button" onClick={() => setSeverity(s)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                        severity === s
                          ? s === "Mild" ? "bg-green-500 text-white border-green-500"
                            : s === "Moderate" ? "bg-amber-500 text-white border-amber-500"
                            : "bg-red-500 text-white border-red-500"
                          : "border-stone-300 text-stone-600 hover:bg-stone-50"
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Duration</label>
                <input type="text"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  placeholder="e.g. 3 days, 2 weeks"
                  value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            {/* Dosha selector with info */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Prakriti (Dosha)</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {["Vata", "Pitta", "Kapha"].map(d => (
                  <button key={d} type="button" onClick={() => setDosha(d)}
                    className={`py-2 rounded-xl border text-sm font-medium transition ${
                      dosha === d ? "bg-ayur-moss text-white border-ayur-moss" : "border-stone-300 text-stone-700 hover:bg-stone-50"
                    }`}>{d}</button>
                ))}
              </div>
              {doshaInfo && (
                <div className={`rounded-xl border px-3 py-2 text-xs ${doshaInfo.color}`}>
                  {doshaInfo.desc}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Advanced (collapsible) */}
          <div className="space-y-3">
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-sm font-semibold text-stone-600 uppercase tracking-wide border-b border-stone-100 pb-2 hover:text-ayur-leaf transition">
              <span>⚕️ Advanced Health Details</span>
              <span className="text-lg">{showAdvanced ? "−" : "+"}</span>
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Blood Group</label>
                    <select className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                      value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                      {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Diet Type</label>
                    <select className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                      value={diet} onChange={(e) => setDiet(e.target.value)}>
                      {DIET_TYPES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Lifestyle</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LIFESTYLE.map(l => (
                      <button key={l} type="button" onClick={() => setLifestyle(l)}
                        className={`py-1.5 rounded-lg border text-xs font-medium transition ${
                          lifestyle === l ? "bg-ayur-moss text-white border-ayur-moss" : "border-stone-300 text-stone-600 hover:bg-stone-50"
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Chronic Conditions</label>
                  <div className="flex flex-wrap gap-2">
                    {CHRONIC_CONDITIONS.map(c => (
                      <button key={c} type="button" onClick={() => toggleChronic(c)}
                        className={`px-3 py-1 rounded-full border text-xs font-medium transition ${
                          chronicConditions.includes(c) ? "bg-red-100 text-red-700 border-red-300" : "border-stone-300 text-stone-600 hover:bg-stone-50"
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Known Allergies</label>
                    <input type="text"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                      placeholder="e.g. pollen, dust, nuts"
                      value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Current Medications</label>
                    <input type="text"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                      placeholder="e.g. metformin, aspirin"
                      value={currentMeds} onChange={(e) => setCurrentMeds(e.target.value)} />
                  </div>
                </div>

                {/* Sliders */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Sleep: <span className="text-ayur-moss font-semibold">{sleepHours} hrs/night</span>
                    </label>
                    <input type="range" min={3} max={12} value={sleepHours}
                      onChange={(e) => setSleepHours(Number(e.target.value))}
                      className="w-full accent-ayur-moss" />
                    <div className="flex justify-between text-xs text-stone-400 mt-0.5">
                      <span>3h (poor)</span><span>7-8h (ideal)</span><span>12h (excess)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Stress Level: <span className={`font-semibold ${stressLevel <= 3 ? "text-green-600" : stressLevel <= 6 ? "text-amber-600" : "text-red-600"}`}>
                        {stressLevel}/10 {stressLevel <= 3 ? "(Low)" : stressLevel <= 6 ? "(Moderate)" : "(High)"}
                      </span>
                    </label>
                    <input type="range" min={1} max={10} value={stressLevel}
                      onChange={(e) => setStressLevel(Number(e.target.value))}
                      className="w-full accent-ayur-moss" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Water Intake: <span className="text-ayur-moss font-semibold">{waterIntake}L/day</span>
                    </label>
                    <input type="range" min={0.5} max={5} step={0.5} value={waterIntake}
                      onChange={(e) => setWaterIntake(Number(e.target.value))}
                      className="w-full accent-ayur-moss" />
                    <div className="flex justify-between text-xs text-stone-400 mt-0.5">
                      <span>0.5L</span><span>2-3L (ideal)</span><span>5L</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-ayur-moss text-white font-semibold hover:bg-ayur-leaf transition disabled:opacity-60 flex items-center justify-center gap-2 text-base">
            {loading && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Analysing your health data…" : "🔬 Get AI Health Insights"}
          </button>
        </form>
      </div>

      {/* Prediction result */}
      {prediction && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ayur-leaf text-lg">AI Analysis Results</h3>
            {saved && <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">✅ Saved to profile</span>}
          </div>

          {/* Confidence bar */}
          {confidencePct !== null && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-stone-600 font-medium">Prediction Confidence</span>
                <span className={`font-bold ${confidencePct >= 70 ? "text-green-600" : confidencePct >= 40 ? "text-amber-600" : "text-red-600"}`}>
                  {confidencePct}%
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-3">
                <div className={`h-3 rounded-full transition-all ${confidencePct >= 70 ? "bg-green-500" : confidencePct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${confidencePct}%` }} />
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {confidencePct >= 70 ? "High confidence — reliable prediction" : confidencePct >= 40 ? "Moderate confidence — consult a doctor" : "Low confidence — please consult a practitioner"}
              </p>
            </div>
          )}

          {/* Results grid */}
          <div className="grid gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl">🔬</span>
              <div>
                <p className="text-xs text-red-600 uppercase tracking-wide font-medium mb-0.5">Predicted Condition</p>
                <p className="font-bold text-red-900 text-lg">{prediction.disease ?? "—"}</p>
                <p className="text-xs text-red-600 mt-1">Severity reported: <strong>{severity}</strong> · Duration: <strong>{duration || "Not specified"}</strong></p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl">🌿</span>
              <div>
                <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium mb-0.5">Ayurvedic Remedy</p>
                <p className="text-emerald-900 text-sm leading-relaxed">{prediction.remedy ?? "—"}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl">🧘</span>
              <div>
                <p className="text-xs text-blue-600 uppercase tracking-wide font-medium mb-0.5">Yoga & Wellness</p>
                <p className="text-blue-900 text-sm leading-relaxed">{prediction.yoga ?? "—"}</p>
              </div>
            </div>

            {/* Lifestyle insights based on inputs */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-xs text-amber-700 uppercase tracking-wide font-medium">💡 Personalised Insights</p>
              <ul className="text-sm text-amber-900 space-y-1">
                {sleepHours < 6 && <li>• 😴 You're sleeping less than 6 hours — aim for 7-8 hours for better recovery.</li>}
                {stressLevel >= 7 && <li>• 😰 High stress detected — consider pranayama and meditation daily.</li>}
                {waterIntake < 1.5 && <li>• 💧 Low water intake — increase to at least 2L/day for better detox.</li>}
                {chronicConditions.some(c => c !== "None") && <li>• ⚕️ Chronic conditions noted: {chronicConditions.filter(c => c !== "None").join(", ")} — inform your Ayurvedic practitioner.</li>}
                {dosha === "Vata" && <li>• 🌬️ Vata types benefit from warm, oily foods and regular routines.</li>}
                {dosha === "Pitta" && <li>• 🔥 Pitta types should avoid spicy food and excessive heat.</li>}
                {dosha === "Kapha" && <li>• 🌊 Kapha types benefit from light, dry foods and vigorous exercise.</li>}
                {sleepHours >= 6 && stressLevel < 7 && waterIntake >= 1.5 && chronicConditions.every(c => c === "None") && (
                  <li>• ✅ Your lifestyle indicators look healthy. Keep maintaining your routine.</li>
                )}
              </ul>
            </div>
          </div>

          <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">
            ⚠️ For informational purposes only — not a clinical diagnosis. Always consult a qualified Ayurvedic practitioner.
          </p>
        </div>
      )}

      {/* Doctor suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <h3 className="font-semibold text-ayur-leaf">🩺 Doctor Suggestions for You</h3>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-emerald-800">Dr. {s.doctorName ?? "Unknown"}</p>
                  {s.createdAt && <p className="text-xs text-emerald-600">{new Date(s.createdAt).toLocaleDateString()}</p>}
                </div>
                <p className="text-sm text-emerald-900 whitespace-pre-wrap">{s.suggestionText}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
