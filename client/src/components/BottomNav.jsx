import { NavLink } from 'react-router-dom';

function triggerHaptic() {
  if (window.Capacitor?.isNativePlatform()) {
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

const tabs = [
  { path: '/', label: 'Dashboard', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { path: '/log', label: 'Log PR', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { path: '/lifts', label: 'My Lifts', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M6.5 6.5h11M6.5 17.5h11M4 6.5V17.5M20 6.5V17.5M2 9v6M22 9v6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { path: '/leaderboard', label: 'Ranks', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M8 21V11M16 21V5M12 21V15M4 21h16" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { path: '/profile', label: 'Profile', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
];

export default function BottomNav() {
  return (
    <nav className="bg-dark-800 border-t border-dark-600 safe-bottom flex-shrink-0">
      <div className="flex items-center h-16">
        {tabs.map((tab, idx) => (
          <div key={tab.path} className="flex items-center flex-1 h-full">
            <NavLink
              to={tab.path}
              end={tab.path === '/'}
              onClick={triggerHaptic}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`
              }
            >
              {tab.icon}
              <span className="text-[10px] font-semibold uppercase tracking-wider">{tab.label}</span>
            </NavLink>
            {idx < tabs.length - 1 && (
              <div className="w-px h-8 bg-dark-600 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
