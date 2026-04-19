import { useEffect, useState } from "react";
import { api } from "../api/client";

type Option = { label: string; vata: number; pitta: number; kapha: number };
type Question = { id: string; text: string; options: Option[] };

type DoshaResult = {
  id: number;
  patientId: number;
  vataScore: number;
  pittaScore: number;
  kaphaScore: number;
  dominantDosha: string;
  createdAt: string;
};

const DOSHA_DESCRIPTIONS: Record<string, string> = {
  Vata:
    "Vata is the energy of movement — creative, quick, and light. When balanced, Vata types are enthusiastic and lively. When imbalanced, they may experience anxiety, dryness, and irregular digestion. Grounding routines, warm foods, and oil massage help restore balance.",
  Pitta:
    "Pitta is the energy of transformation — focused, driven, and passionate. When balanced, Pitta types are sharp and courageous. When imbalanced, they may experience irritability, inflammation, and excess heat. Cooling foods, relaxation, and time in nature restore balance.",
  Kapha:
    "Kapha is the energy of structure — calm, nurturing, and steady. When balanced, Kapha types are loving and patient. When imbalanced, they may experience lethargy, weight gain, and congestion. Stimulating exercise, light foods, and variety restore balance.",
};

const DOSHA_COLORS: Record<string, string> = {
  Vata: "bg-blue-100 text-blue-800 border-blue-200",
  Pitta: "bg-red-100 text-red-800 border-red-200",
  Kapha: "bg-green-100 text-green-800 border-green-200",
};

export default function DoshaQuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<DoshaResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api
      .get<Question[]>("/dosha-test/questions")
      .then((r) => setQuestions(r.data))
      .catch((e) => {
        const ax = e as { response?: { data?: { message?: string } }; message?: string };
        setErr(ax.response?.data?.message ?? ax.message ?? "Failed to load questions");
      })
      .finally(() => setFetching(false));
  }, []);

  const total = questions.length;
  const current = questions[currentIndex];
  const selectedOption = current ? answers[current.id] : undefined;
  const isLast = currentIndex === total - 1;
  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  function selectOption(idx: number) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: idx }));
  }

  function next() {
    if (selectedOption === undefined) return;
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    }
  }

  async function submit() {
    if (selectedOption === undefined) return;
    setErr(null);
    setLoading(true);
    const payload = {
      answers: Object.entries(answers).map(([questionId, optionIndex]) => ({
        questionId,
        optionIndex,
      })),
    };
    try {
      const { data } = await api.post<DoshaResult>("/dosha-test", payload);
      setResult(data);
      // Dispatch custom event so ChatbotWidget can auto-open
      window.dispatchEvent(
        new CustomEvent("aryoga:dosha-complete", { detail: { dosha: data.dominantDosha } })
      );
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setErr(ax.response?.data?.message ?? ax.message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-ayur-moss border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    const dosha = result.dominantDosha;
    const colorClass = DOSHA_COLORS[dosha] ?? "bg-stone-100 text-stone-800 border-stone-200";
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-stone-500 text-sm">Your dominant Dosha is</p>
            <span
              className={`inline-block text-3xl font-bold px-6 py-2 rounded-full border-2 ${colorClass}`}
            >
              {dosha}
            </span>
          </div>

          {/* Score bars */}
          <div className="space-y-2">
            {[
              { label: "Vata", score: result.vataScore, color: "bg-blue-400" },
              { label: "Pitta", score: result.pittaScore, color: "bg-red-400" },
              { label: "Kapha", score: result.kaphaScore, color: "bg-green-400" },
            ].map(({ label, score, color }) => {
              const max = Math.max(result.vataScore, result.pittaScore, result.kaphaScore, 1);
              const pct = Math.round((score / max) * 100);
              return (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-12 text-stone-600">{label}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-3">
                    <div
                      className={`${color} h-3 rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-stone-500 text-right">{score}</span>
                </div>
              );
            })}
          </div>

          {/* Description */}
          <div className={`rounded-xl border p-4 text-sm ${colorClass}`}>
            <p className="font-semibold mb-1">{dosha} — What this means</p>
            <p>{DOSHA_DESCRIPTIONS[dosha] ?? "Consult an Ayurvedic practitioner for details."}</p>
          </div>

          <p className="text-xs text-stone-400 text-center">
            The chatbot has been notified of your result and is ready to help. 💬
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setAnswers({});
            setCurrentIndex(0);
          }}
          className="w-full py-2 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50"
        >
          Retake questionnaire
        </button>
      </div>
    );
  }

  // ── Quiz screen ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ayur-leaf">Dosha questionnaire</h2>
        <span className="text-sm text-stone-500">
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-stone-100 rounded-full h-2">
        <div
          className="bg-ayur-moss h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {current && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <p className="font-semibold text-stone-800 text-lg">{current.text}</p>

          <div className="space-y-2">
            {current.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectOption(idx)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                  selectedOption === idx
                    ? "bg-ayur-moss/10 border-ayur-moss text-ayur-leaf font-medium"
                    : "border-stone-200 hover:bg-stone-50 text-stone-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => i - 1)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50"
              >
                ← Back
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                onClick={next}
                disabled={selectedOption === undefined}
                className="flex-1 py-2 rounded-lg bg-ayur-moss text-white font-medium disabled:opacity-50 hover:bg-ayur-leaf transition"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={selectedOption === undefined || loading}
                className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-medium disabled:opacity-50 hover:bg-amber-700 transition flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {loading ? "Calculating…" : "Calculate my Dosha ✨"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
