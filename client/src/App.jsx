import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PremiumProvider } from './context/PremiumContext';
import { NotificationProvider } from './context/NotificationContext';

// Global light haptic on every button/link tap
function triggerLightHaptic() {
  if (localStorage.getItem('sc_haptics') === 'false') return;
  if (window.Capacitor?.isNativePlatform()) {
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

function useGlobalHaptics() {
  useEffect(() => {
    const handler = (e) => {
      const el = e.target.closest('button, a, [role="button"]');
      if (el) triggerLightHaptic();
    };
    document.addEventListener('pointerdown', handler, { passive: true });
    return () => document.removeEventListener('pointerdown', handler);
  }, []);
}
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LogPR from './pages/LogPR';
import MyLifts from './pages/MyLifts';
// Leaderboard is now embedded in Friends page
import Profile from './pages/Profile';
import Overview from './pages/Overview';
import Friends from './pages/Friends';
import FriendProfile from './pages/FriendProfile';
import Settings from './pages/Settings';
import PlateCalculator from './pages/PlateCalculator';
import Challenges from './pages/Challenges';

function PageWrapper({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page-in page-content">
      {children}
    </div>
  );
}

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="fixed inset-0 flex justify-center bg-black">
      <div className="w-full max-w-lg flex flex-col bg-dark-900 safe-top sm:border-x sm:border-dark-600 overflow-x-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none pb-4">
          <Routes>
            <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="/log" element={<PageWrapper><LogPR /></PageWrapper>} />
            <Route path="/lifts" element={<PageWrapper><MyLifts /></PageWrapper>} />
            {/* Leaderboard is now a sub-tab in Friends */}
            <Route path="/overview" element={<PageWrapper><Overview /></PageWrapper>} />
            <Route path="/friends" element={<PageWrapper><Friends /></PageWrapper>} />
            <Route path="/friends/:friendId" element={<PageWrapper><FriendProfile /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
            <Route path="/plate-calculator" element={<PageWrapper><PlateCalculator /></PageWrapper>} />
            <Route path="/challenges" element={<PageWrapper><Challenges /></PageWrapper>} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  useGlobalHaptics();
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
