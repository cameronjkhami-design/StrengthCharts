import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PremiumProvider } from './context/PremiumContext';
import { NotificationProvider } from './context/NotificationContext';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LogPR from './pages/LogPR';
import MyLifts from './pages/MyLifts';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="fixed inset-0 flex justify-center bg-black">
      <div className="w-full max-w-lg flex flex-col bg-dark-900 safe-top sm:border-x sm:border-dark-600">
        <div className="flex-1 overflow-y-auto overscroll-none pb-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<LogPR />} />
            <Route path="/lifts" element={<MyLifts />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PremiumProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </PremiumProvider>
    </AuthProvider>
  );
}
