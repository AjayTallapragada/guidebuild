import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "../../features/auth/LoginPage";
import { RegisterPage } from "../../features/auth/RegisterPage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { PoliciesPage } from "../../features/policies/PoliciesPage";
import { PremiumPage } from "../../features/premium/PremiumPage";
import { ClaimsPage } from "../../features/claims/ClaimsPage";
import { PayoutsPage } from "../../features/payouts/PayoutsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="premium" element={<PremiumPage />} />
          <Route path="claims" element={<ClaimsPage />} />
          <Route path="payouts" element={<PayoutsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
