import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-4xl font-bold text-ayur-leaf">AryogaSutra</h1>
      <p className="text-stone-600 max-w-xl mx-auto">
        Intelligent Ayurveda-aware healthcare: dosha quiz, AI wellness patterns, appointments, nearby
        doctors, and PDF summaries — integrated with Spring Boot, MySQL, and a Python ML service.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          to="/register"
          className="px-4 py-2 rounded-lg bg-ayur-moss text-white font-medium hover:bg-ayur-leaf"
        >
          Get started
        </Link>
        <Link
          to="/login"
          className="px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 font-medium"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
