import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

function triggerHaptic() {
  if (localStorage.getItem('sc_haptics') === 'false') return;
  if (window.Capacitor?.isNativePlatform()) {
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

function triggerHeavyHaptic() {
  if (localStorage.getItem('sc_haptics') === 'false') return;
  if (window.Capacitor?.isNativePlatform()) {
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

const DEFAULT_TABS = [
  { id: 'home', path: '/', label: 'Home', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'log', path: '/log', label: 'Log Lift', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'lifts', path: '/lifts', label: 'My Lifts', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M6.5 6.5h11M6.5 17.5h11M4 6.5V17.5M20 6.5V17.5M2 9v6M22 9v6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'overview', path: '/overview', label: 'Overview', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'friends', path: '/friends', label: 'Friends', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'profile', path: '/profile', label: 'Profile', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
];

function getOrderedTabs() {
  const saved = localStorage.getItem('sc_nav_order');
  if (!saved) return DEFAULT_TABS;
  try {
    const orderIds = JSON.parse(saved);
    const ordered = [];
    for (const id of orderIds) {
      const tab = DEFAULT_TABS.find(t => t.id === id);
      if (tab) ordered.push(tab);
    }
    // Add any tabs not in saved order (in case new tabs are added)
    for (const tab of DEFAULT_TABS) {
      if (!ordered.find(t => t.id === tab.id)) ordered.push(tab);
    }
    return ordered;
  } catch {
    return DEFAULT_TABS;
  }
}

export default function BottomNav() {
  const location = useLocation();
  const [tabs, setTabs] = useState(getOrderedTabs);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const longPressTimer = useRef(null);
  const touchStartX = useRef(0);
  const navRef = useRef(null);
  const dragBlocked = useRef(false);

  // Clean up long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleTouchStart = useCallback((idx, e) => {
    touchStartX.current = e.touches[0].clientX;
    dragBlocked.current = false;
    longPressTimer.current = setTimeout(() => {
      setDragIdx(idx);
      setOverIdx(idx);
      dragBlocked.current = true;
      triggerHeavyHaptic();
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (dragIdx === null) {
      // Cancel long press if finger moves before activation
      if (longPressTimer.current) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
        if (dx > 10) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    const navEl = navRef.current;
    if (!navEl) return;
    // Find which tab the finger is over
    const children = navEl.children;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
        setOverIdx(i);
        break;
      }
    }
  }, [dragIdx]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      setTabs(prev => {
        const newTabs = [...prev];
        const [moved] = newTabs.splice(dragIdx, 1);
        newTabs.splice(overIdx, 0, moved);
        localStorage.setItem('sc_nav_order', JSON.stringify(newTabs.map(t => t.id)));
        return newTabs;
      });
    }
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, overIdx]);

  return (
    <nav className="bg-dark-800 border-t border-dark-600 safe-bottom flex-shrink-0 select-none">
      <div
        ref={navRef}
        className="flex items-center h-16"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {tabs.map((tab, idx) => (
          <div
            key={tab.id}
            className={`flex items-center flex-1 h-full transition-all duration-150 ${
              dragIdx === idx ? 'scale-110 z-10 bg-primary/10 rounded-lg' :
              dragIdx !== null && overIdx === idx ? 'bg-primary/5' : ''
            }`}
            onTouchStart={(e) => handleTouchStart(idx, e)}
          >
            {dragIdx !== null ? (
              // During drag mode, render a plain div instead of NavLink to prevent navigation
              <div
                className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                  dragIdx === idx ? 'text-primary' :
                  location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path))
                    ? 'text-primary' : 'text-gray-500'
                }`}
              >
                {tab.icon}
                <span className="text-[9px] font-semibold uppercase tracking-wider">{tab.label}</span>
              </div>
            ) : (
              <NavLink
                to={tab.path}
                end={tab.path === '/'}
                onClick={(e) => {
                  if (dragBlocked.current) {
                    e.preventDefault();
                    dragBlocked.current = false;
                    return;
                  }
                  triggerHaptic();
                }}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                    isActive ? 'text-primary' : 'text-gray-500'
                  }`
                }
              >
                {tab.icon}
                <span className="text-[9px] font-semibold uppercase tracking-wider">{tab.label}</span>
              </NavLink>
            )}
          </div>
        ))}
      </div>
      {dragIdx !== null && (
        <div className="absolute bottom-full left-0 right-0 text-center pb-1">
          <span className="text-primary/60 text-[10px] font-display font-bold uppercase animate-pulse">
            Drag to reorder
          </span>
        </div>
      )}
    </nav>
  );
}
