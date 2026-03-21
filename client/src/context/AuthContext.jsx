import { createContext, useContext, useState, useEffect } from 'react';
import { applyThemeColor, applyThemeMode, getThemeMode } from '../utils/colors';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sc_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      applyThemeColor(parsed.theme_color);
      applyThemeMode(getThemeMode());
      return parsed;
    }
    applyThemeMode(getThemeMode());
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('sc_user', JSON.stringify(user));
      applyThemeColor(user.theme_color);
    } else {
      localStorage.removeItem('sc_user');
      applyThemeColor(null);
    }
  }, [user]);

  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);
  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
