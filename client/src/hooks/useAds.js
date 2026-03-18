import { useState, useEffect, useCallback } from 'react';

const isNative = !!window.Capacitor?.isNativePlatform();

// Use test ad unit ID for development
// Replace with your real ad unit ID for production
const REWARDED_AD_UNIT_ID = isNative
  ? 'ca-app-pub-3940256099942544/1712485313' // Google test rewarded ad
  : '';

export function useAds() {
  const [adLoaded, setAdLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const prepareRewardedAd = useCallback(async () => {
    if (!isNative) return;
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareRewardVideoAd({
        adId: REWARDED_AD_UNIT_ID,
        isTesting: true, // Set to false for production
      });
      setAdLoaded(true);
    } catch (err) {
      console.warn('Failed to prepare rewarded ad:', err);
      setAdLoaded(false);
    }
  }, []);

  useEffect(() => {
    if (!isNative) return;

    const initAds = async () => {
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        await AdMob.initialize({
          requestTrackingAuthorization: true,
          initializeForTesting: true, // Set to false for production
        });
        setInitialized(true);
        await prepareRewardedAd();
      } catch (err) {
        console.warn('AdMob init error:', err);
      }
    };

    initAds();
  }, [prepareRewardedAd]);

  const showRewardedAd = useCallback(async () => {
    if (!isNative) return false;
    setLoading(true);

    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.showRewardVideoAd();
      setAdLoaded(false);
      // Preload next ad after a short delay
      setTimeout(() => prepareRewardedAd(), 1000);
      setLoading(false);
      return true; // User watched the full ad
    } catch (err) {
      console.warn('Rewarded ad error:', err);
      setLoading(false);
      setTimeout(() => prepareRewardedAd(), 1000);
      return false;
    }
  }, [prepareRewardedAd]);

  return {
    adLoaded: isNative ? adLoaded : false,
    loading,
    showRewardedAd,
    initialized,
    isNative,
  };
}
