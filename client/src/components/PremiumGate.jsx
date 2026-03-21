import { useState } from 'react';
import { usePremium } from '../context/PremiumContext';
import { useAds } from '../hooks/useAds';
import ProUpgradeModal from './ProUpgradeModal';

export function ProTag({ inverted = false }) {
  return (
    <span className={`inline-flex items-center text-[9px] font-display font-bold uppercase px-2 py-0.5 rounded-full tracking-wider ${
      inverted
        ? 'bg-dark-900 text-white border border-dark-900/60'
        : 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20'
    }`}>
      PRO
    </span>
  );
}

export default function PremiumGate({ featureId, children, blurContent = false }) {
  const { hasAccess, unlockFeatureTemporarily } = usePremium();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [adLoading, setAdLoading] = useState(false);

  // Ads hook — safe to call unconditionally
  const { showRewardedAd, adLoaded, isNative } = useAds();

  if (hasAccess(featureId)) {
    return children;
  }

  const handleWatchAd = async () => {
    setAdLoading(true);
    try {
      const success = await showRewardedAd();
      if (success) {
        unlockFeatureTemporarily(featureId);
      }
    } catch {}
    setAdLoading(false);
  };

  return (
    <>
      <div className="relative">
        {blurContent && (
          <div className="blur-sm pointer-events-none opacity-50">
            {children}
          </div>
        )}
        <div className={`${blurContent ? 'absolute inset-0 flex items-center justify-center' : ''}`}>
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={() => setShowUpgrade(true)}
              className="w-full py-4 rounded-xl bg-primary/10 border border-primary/30 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-primary font-display font-bold text-sm uppercase">Unlock with Pro</span>
              <span className="text-gray-500 text-xs">Upgrade to access this feature</span>
            </button>

            <button
              onClick={handleWatchAd}
              disabled={adLoading || (isNative && !adLoaded)}
              className="w-full py-3 rounded-xl bg-dark-700 border border-dark-500 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span className="text-gray-300 font-display font-bold text-sm uppercase">
                {adLoading ? 'Loading...' : 'Watch Ad — Unlock 24hrs'}
              </span>
            </button>
          </div>
        </div>
      </div>
      <ProUpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}
