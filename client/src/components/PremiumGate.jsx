import { useState } from 'react';
import { usePremium, PREMIUM_FEATURES } from '../context/PremiumContext';
import { useAds } from '../hooks/useAds';
import ProUpgradeModal from './ProUpgradeModal';

export default function PremiumGate({ featureId, children, blurContent = false }) {
  const { hasAccess, unlockFeatureTemporarily, isNative } = usePremium();
  const { showRewardedAd, adLoaded, loading: adLoading } = useAds();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // If user has access, render children directly
  if (hasAccess(featureId)) {
    return children;
  }

  const handleWatchAd = async () => {
    const rewarded = await showRewardedAd();
    if (rewarded) {
      unlockFeatureTemporarily(featureId);
    }
  };

  return (
    <>
      <div className="relative">
        {/* Blurred preview of locked content */}
        {blurContent && (
          <div className="filter blur-sm pointer-events-none opacity-40 select-none">
            {children}
          </div>
        )}

        {/* Gate overlay */}
        <div className={blurContent ? 'absolute inset-0 flex items-center justify-center' : ''}>
          <div className="card bg-dark-700 border-primary/30 text-center py-6 px-4 w-full">
            {/* Pro badge */}
            <div className="inline-block bg-primary/10 rounded-full px-3 py-1 mb-3">
              <span className="text-primary font-display font-bold text-xs uppercase tracking-wider">
                Pro Feature
              </span>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Watch a short ad to unlock for 24h, or subscribe to Pro for $2.99/mo.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleWatchAd}
                disabled={!adLoaded || adLoading}
                className="btn-secondary text-sm flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {adLoading ? 'Loading Ad...' : 'Watch Ad to Unlock (24h)'}
              </button>

              <button
                onClick={() => setShowUpgrade(true)}
                className="btn-primary text-sm"
              >
                Go Pro — $2.99/mo
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProUpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}
