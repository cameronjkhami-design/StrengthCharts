import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3500);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <div className="w-full max-w-lg px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              className={`mb-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-display font-bold uppercase tracking-wider animate-slide-down pointer-events-auto backdrop-blur-md ${
                n.type === 'success' ? 'bg-green-900/90 text-green-400 border border-green-700' :
                n.type === 'error' ? 'bg-red-900/90 text-red-400 border border-red-700' :
                n.type === 'friend' ? 'bg-primary/90 text-dark-900 border border-primary' :
                'bg-dark-800/95 text-white border border-primary/40'
              }`}
            >
              {n.message}
            </div>
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
