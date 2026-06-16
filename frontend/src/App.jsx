import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import QRScanner from './components/QRScanner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DeviceDetails from './pages/DeviceDetails';
import DevicePublic from './pages/DevicePublic';
import MapPage from './pages/MapPage';
import Profile from './pages/Profile';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppLayout({ children, fullWidth }) {
  return (
    <div className="min-h-dvh bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <div className={`flex-1 flex flex-col w-full ${fullWidth ? '' : 'max-w-5xl mx-auto md:px-6'}`}>
          {children}
        </div>
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
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/device/:id" element={<ProtectedRoute><DeviceDetails /></ProtectedRoute>} />
        <Route path="/d/:id" element={<DevicePublic />} />
        <Route path="/map" element={<ProtectedRoute><AppLayout fullWidth><MapPage /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
