import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatbotWidget from "./ChatbotWidget";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-2 py-1 rounded-md text-sm ${isActive ? "bg-ayur-moss text-white" : "text-stone-700 hover:bg-stone-200"}`;

export default function Layout() {
  const { auth, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="font-bold text-ayur-leaf text-lg tracking-wide">
            AryogaSutra
          </Link>
          {auth.token ? (
            <nav className="flex flex-wrap items-center gap-2">
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              {auth.role === "PATIENT" && (
                <>
                  <NavLink to="/patient" className={linkClass}>
                    Profile
                  </NavLink>
                  <NavLink to="/dosha" className={linkClass}>
                    Dosha test
                  </NavLink>
                  <NavLink to="/nearby" className={linkClass}>
                    Nearby doctors
                  </NavLink>
                  <NavLink to="/appointments" className={linkClass}>
                    Appointments
                  </NavLink>
                  <NavLink to="/ai" className={linkClass}>
                    AI insights
                  </NavLink>
                  <NavLink to="/report" className={linkClass}>
                    Report
                  </NavLink>
                </>
              )}
              {(auth.role === "DOCTOR" || auth.role === "ADMIN") && (
                <NavLink to="/doctor" className={linkClass}>
                  Doctor panel
                </NavLink>
              )}
              <button
                type="button"
                onClick={logout}
                className="text-sm px-2 py-1 rounded-md border border-stone-300 hover:bg-stone-100"
              >
                Logout
              </button>
            </nav>
          ) : (
            <nav className="flex gap-2">
              <NavLink to="/login" className={linkClass}>
                Login
              </NavLink>
              <NavLink to="/register" className={linkClass}>
                Register
              </NavLink>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <ChatbotWidget />
      <footer className="text-center text-xs text-stone-500 py-4 border-t border-stone-200 bg-white">
        Demo system — not for clinical use. Ports: UI 3000 · API 8080 · ML 5000
      </footer>
    </div>
  );
}
