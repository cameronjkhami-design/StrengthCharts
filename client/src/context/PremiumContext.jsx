import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const PremiumContext = createContext(null);

// Feature IDs for gating
export const PREMIUM_FEATURES = {
  FRIEND_LEADERBOARD: 'friend_leaderboard',
  STRENGTH_BW_RATIO_CHART: 'strength_bw_ratio_chart',
  EXPORT_PR_DATA: 'export_pr_data',
  OVERLAY_CHARTS: 'overlay_charts',
  BW_TRENDLINE: 'bw_trendline',
  ACHIEVEMENTS: 'achievements',
};

export function PremiumProvider({ children }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  // Track temporarily unlocked features (via rewarded ads)
  // { featureId: expiryTimestamp }
  const [unlockedFeatures, setUnlockedFeatures] = useState(() => {
    const saved = localStorage.getItem('sc_unlocked');
    return saved ? JSON.parse(saved) : {};
  });

  const isNative = !!window.Capacitor?.isNativePlatform();

  // Sync premium from user profile
  useEffect(() => {
    setIsPremium(!!user?.is_premium);
  }, [user?.is_premium]);

  // Persist unlocked features
  useEffect(() => {
    localStorage.setItem('sc_unlocked', JSON.stringify(unlockedFeatures));
  }, [unlockedFeatures]);

  const hasAccess = useCallback((featureId) => {
    if (isPremium) return true;
    const expiry = unlockedFeatures[featureId];
    if (expiry && Date.now() < expiry) return true;
    return false;
  }, [isPremium, unlockedFeatures]);

  const unlockFeatureTemporarily = useCallback((featureId, durationMs = 24 * 60 * 60 * 1000) => {
    setUnlockedFeatures(prev => ({
      ...prev,
      [featureId]: Date.now() + durationMs,
    }));
  }, []);

  const setPremiumStatus = useCallback((status) => {
    setIsPremium(status);
  }, []);

  return (
    <PremiumContext.Provider value={{
      isPremium,
      hasAccess,
      unlockFeatureTemporarily,
      setPremiumStatus,
      isNative,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
