import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth.js";
import { AppLayout } from "./layout/AppLayout.js";
import { LoginPage } from "./pages/LoginPage.js";
import { SetupPage } from "./pages/SetupPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { PatientsListPage } from "./pages/PatientsListPage.js";
import { PatientDetailPage } from "./pages/PatientDetailPage.js";
import { FactureFormPage } from "./pages/FactureFormPage.js";
import { FacturesListPage } from "./pages/FacturesListPage.js";
import { BordereauxListPage } from "./pages/BordereauxListPage.js";
import { BordereauDetailPage } from "./pages/BordereauDetailPage.js";
import { ParametresPage } from "./pages/ParametresPage.js";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement...</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <AppLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientsListPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/factures" element={<FacturesListPage />} />
        <Route path="/factures/nouvelle" element={<FactureFormPage />} />
        <Route path="/factures/:id/modifier" element={<FactureFormPage />} />
        <Route path="/bordereaux" element={<BordereauxListPage />} />
        <Route path="/bordereaux/:id" element={<BordereauDetailPage />} />
        <Route path="/parametres" element={<ParametresPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
