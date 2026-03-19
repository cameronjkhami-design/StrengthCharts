import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Overview from './pages/Overview';
import Friends from './pages/Friends';
import FriendProfile from './pages/FriendProfile';

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
            <Route path="/leaderboard" element={<PageWrapper><Leaderboard /></PageWrapper>} />
            <Route path="/overview" element={<PageWrapper><Overview /></PageWrapper>} />
            <Route path="/friends" element={<PageWrapper><Friends /></PageWrapper>} />
            <Route path="/friends/:friendId" element={<PageWrapper><FriendProfile /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
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
