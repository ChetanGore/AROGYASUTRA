import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import DashboardPage from "./pages/DashboardPage";
import PatientProfilePage from "./pages/PatientProfilePage";
import DoctorPanelPage from "./pages/DoctorPanelPage";
import AiPage from "./pages/AiPage";
import DoshaQuizPage from "./pages/DoshaQuizPage";
import NearbyDoctorsPage from "./pages/NearbyDoctorsPage";
import ReportPage from "./pages/ReportPage";
import AppointmentsPage from "./pages/AppointmentsPage";

function RequireAuth({ children, roles }: { children: ReactElement; roles?: string[] }) {
  const { auth } = useAuth();
  if (!auth.token) return <Navigate to="/login" replace />;
  if (roles && auth.role && !roles.includes(auth.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/patient"
          element={
            <RequireAuth roles={["PATIENT"]}>
              <PatientProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/doctor"
          element={
            <RequireAuth roles={["DOCTOR", "ADMIN"]}>
              <DoctorPanelPage />
            </RequireAuth>
          }
        />
        <Route
          path="/ai"
          element={
            <RequireAuth>
              <AiPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dosha"
          element={
            <RequireAuth roles={["PATIENT"]}>
              <DoshaQuizPage />
            </RequireAuth>
          }
        />
        <Route
          path="/nearby"
          element={
            <RequireAuth roles={["PATIENT"]}>
              <NearbyDoctorsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/appointments"
          element={
            <RequireAuth roles={["PATIENT"]}>
              <AppointmentsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/report"
          element={
            <RequireAuth roles={["PATIENT"]}>
              <ReportPage />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  );
}
