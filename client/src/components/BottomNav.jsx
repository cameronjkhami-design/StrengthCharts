import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'log', path: '/log', label: 'Log Lift', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'lifts', path: '/lifts', label: 'My Lifts', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M6.5 6.5h11M6.5 17.5h11M4 6.5V17.5M20 6.5V17.5M2 9v6M22 9v6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'overview', path: '/overview', label: 'Overview', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'friends', path: '/friends', label: 'Friends', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'profile', path: '/profile', label: 'Profile', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
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
    for (const tab of DEFAULT_TABS) {
      if (!ordered.find(t => t.id === tab.id)) ordered.push(tab);
    }
    return ordered;
  } catch {
    return DEFAULT_TABS;
  }
}

function isActive(tabPath, currentPath) {
  if (tabPath === '/') return currentPath === '/';
  return currentPath === tabPath || currentPath.startsWith(tabPath + '/');
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState(getOrderedTabs);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const longPressTimer = useRef(null);
  const touchStartX = useRef(0);
  const navRef = useRef(null);
  // Use refs to avoid stale closures in touch handlers
  const dragIdxRef = useRef(null);
  const overIdxRef = useRef(null);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleTouchStart = (idx, e) => {
    touchStartX.current = e.touches[0].clientX;
    longPressTimer.current = setTimeout(() => {
      setDragIdx(idx);
      setOverIdx(idx);
      dragIdxRef.current = idx;
      overIdxRef.current = idx;
      triggerHeavyHaptic();
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (dragIdxRef.current === null) {
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
    const children = navEl.children;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
        setOverIdx(i);
        overIdxRef.current = i;
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const di = dragIdxRef.current;
    const oi = overIdxRef.current;
    if (di !== null && oi !== null && di !== oi) {
      setTabs(prev => {
        const newTabs = [...prev];
        const [moved] = newTabs.splice(di, 1);
        newTabs.splice(oi, 0, moved);
        localStorage.setItem('sc_nav_order', JSON.stringify(newTabs.map(t => t.id)));
        return newTabs;
      });
    }
    setDragIdx(null);
    setOverIdx(null);
    dragIdxRef.current = null;
    overIdxRef.current = null;
  };

  const handleTabTap = (tab) => {
    // Don't navigate if we just finished dragging
    if (dragIdxRef.current !== null) return;
    triggerHaptic();
    navigate(tab.path);
  };

  return (
    <nav className="bg-dark-800 border-t border-dark-600 safe-bottom flex-shrink-0 select-none relative">
      {dragIdx !== null && (
        <div className="absolute -top-6 left-0 right-0 text-center">
          <span className="text-primary/70 text-[10px] font-display font-bold uppercase animate-pulse bg-dark-800/90 px-3 py-1 rounded-full">
            Drag to reorder
          </span>
        </div>
      )}
      <div
        ref={navRef}
        className="flex items-center gap-1 px-1.5 py-1.5"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {tabs.map((tab, idx) => {
          const active = isActive(tab.path, location.pathname);
          const isDragged = dragIdx === idx;
          const isDropTarget = dragIdx !== null && dragIdx !== idx && overIdx === idx;

          return (
            <button
              key={tab.id}
              onTouchStart={(e) => handleTouchStart(idx, e)}
              onClick={() => handleTabTap(tab)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all duration-150 ${
                isDragged
                  ? 'bg-primary/20 text-primary scale-110 z-10 border border-primary/40 shadow-lg shadow-primary/10'
                  : isDropTarget
                  ? 'bg-primary/10 text-gray-400 border border-primary/20'
                  : active
                  ? 'bg-dark-700 text-primary border border-dark-500'
                  : 'text-gray-500 border border-transparent'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
