import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DevicesProvider } from './context/DevicesContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import QRScanner from './components/QRScanner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

// Heavy / rarely-visited routes are code-split so the login bundle stays lean.
const DeviceDetails = lazy(() => import('./pages/DeviceDetails'));
const DevicePublic = lazy(() => import('./pages/DevicePublic'));
const MapPage = lazy(() => import('./pages/MapPage'));
const Profile = lazy(() => import('./pages/Profile'));
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'));
const AccountSettings = lazy(() => import('./pages/settings/AccountSettings'));
const AppearanceSettings = lazy(() => import('./pages/settings/AppearanceSettings'));
const MapDisplaySettings = lazy(() => import('./pages/settings/MapDisplaySettings'));
const DeviceSettings = lazy(() => import('./pages/settings/DeviceSettings'));
const AlertSettings = lazy(() => import('./pages/settings/AlertSettings'));
const BackendSettings = lazy(() => import('./pages/settings/BackendSettings'));
const DataSettings = lazy(() => import('./pages/settings/DataSettings'));
const AboutSettings = lazy(() => import('./pages/settings/AboutSettings'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <span className="label-mono">Loading…</span>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 border border-hairline-3 rounded-sm" />
            <div className="absolute inset-0 border-t border-white rounded-sm animate-spin" style={{ animationDuration: '0.8s' }} />
          </div>
          <span className="label-mono">Connecting</span>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 border border-hairline-3 rounded-sm" />
            <div className="absolute inset-0 border-t border-white rounded-sm animate-spin" style={{ animationDuration: '0.8s' }} />
          </div>
          <span className="label-mono">Connecting</span>
        </div>
      </div>
    );
  }
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppLayout({ children, fullWidth, hideFooter = false }) {
  return (
    <div className="min-h-dvh bg-canvas flex">
      <Sidebar />
      {/* Pages own their content width (Header is full-bleed; page bodies
          constrain themselves) — `fullWidth` skips the default column. */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <div className={`flex-1 flex flex-col w-full ${fullWidth ? '' : 'max-w-5xl mx-auto'}`}>
          {children}
        </div>
        {!hideFooter && <Footer />}
      </div>
      <BottomNav />
    </div>
  );
}

function AuthLogoutHandler() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  useEffect(() => {
    const handler = () => {
      logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [navigate, logout]);
  return null;
}

function ScanHandler({ onOpen }) {
  useEffect(() => {
    const handler = () => onOpen();
    window.addEventListener('scan:open', handler);
    return () => window.removeEventListener('scan:open', handler);
  }, [onOpen]);
  return null;
}

function AppRoutes() {
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <>
      <AuthLogoutHandler />
      <ScanHandler onOpen={() => setScanOpen(true)} />
      {scanOpen && <QRScanner isOpen={scanOpen} onClose={() => setScanOpen(false)} />}
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/device/:id" element={<ProtectedRoute><DeviceDetails /></ProtectedRoute>} />
        <Route path="/d/:id" element={<DevicePublic />} />
        <Route path="/map" element={<ProtectedRoute><AppLayout fullWidth hideFooter><MapPage /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><SettingsLayout /></AppLayout></ProtectedRoute>}>
          <Route index element={<Profile />} />
          <Route path="account" element={<AccountSettings />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="map" element={<MapDisplaySettings />} />
          <Route path="devices" element={<DeviceSettings />} />
          <Route path="alerts" element={<AlertSettings />} />
          <Route path="backend" element={<BackendSettings />} />
          <Route path="data" element={<DataSettings />} />
          <Route path="about" element={<AboutSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <DevicesProvider>
            <AppRoutes />
          </DevicesProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
