import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { useAuthStore } from './store/authStore';
import { tokenManager } from './lib/tokenManager';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import PcManagement from './pages/admin/PcManagement';
import Members from './pages/admin/Members';
import Prices from './pages/admin/Prices';
import ShiftReport from './pages/admin/Report';
import OwnerDashboard from './pages/owner/Dashboard';
import OwnerReport from './pages/owner/Report';
import './App.css';

/**
 * ProtectedRoute — checks BOTH Zustand state AND token in localStorage.
 * Dual check prevents edge cases where Zustand rehydrates after the first render.
 */
const ProtectedRoute = ({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole: 'admin' | 'owner';
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const hasToken = !!tokenManager.get();

  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (hasToken && !isAuthenticated) {
    return <>{children}</>;
  }

  if (user && user.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <div className="min-h-screen bg-dark text-white font-sans">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* ── Admin Routes (role: admin) ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/pcs"       element={<ProtectedRoute allowedRole="admin"><PcManagement /></ProtectedRoute>} />
          <Route path="/admin/members"   element={<ProtectedRoute allowedRole="admin"><Members /></ProtectedRoute>} />
          <Route path="/admin/prices"    element={<ProtectedRoute allowedRole="admin"><Prices /></ProtectedRoute>} />
          <Route path="/admin/report"    element={<ProtectedRoute allowedRole="admin"><ShiftReport /></ProtectedRoute>} />
          <Route path="/admin/*"         element={<Navigate to="/admin/dashboard" replace />} />

          {/* ── Owner Routes (role: owner) — read-only financial view ── */}
          <Route path="/owner/dashboard" element={<ProtectedRoute allowedRole="owner"><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/owner/report"    element={<ProtectedRoute allowedRole="owner"><OwnerReport /></ProtectedRoute>} />
          <Route path="/owner/*"         element={<Navigate to="/owner/dashboard" replace />} />

          {/* Defaults */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/unauthorized" element={
            <div className="flex h-screen items-center justify-center flex-col gap-4">
              <p className="text-red-400 text-xl font-semibold">⛔ Akses Ditolak</p>
              <p className="text-neutral-500 text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
              <a href="/login" className="text-primary hover:underline text-sm">← Kembali ke Login</a>
            </div>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
