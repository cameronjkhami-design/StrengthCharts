import { useState } from 'react';
import { usePurchases } from '../hooks/usePurchases';
import { usePremium } from '../context/PremiumContext';
import { useAds } from '../hooks/useAds';

const FEATURES = [
  'Friend leaderboard — compete with your crew',
  'Bodyweight trendline chart',
  'Achievements & profile badges',
  'Strength-to-bodyweight ratio trend charts',
  'Export your PR data',
  'Overlay multiple exercise charts',
  'No ads — ever',
];

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: '$2.99', period: '/mo' },
  { id: 'annual', label: 'Annual', price: '$24.99', period: '/yr', badge: 'Save 30%' },
  { id: 'lifetime', label: 'Lifetime', price: '$69.99', period: '', badge: 'Best Value' },
];

export default function ProUpgradeModal({ isOpen, onClose }) {
  const { product, purchasing, restoring, purchasePro, restorePurchases, isNative } = usePurchases();
  const { isPremium, unlockFeatureTemporarily } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState('annual');

  // Try to use ads hook if available
  let watchAd = null;
  try {
    const ads = useAds();
    watchAd = ads?.showRewardedAd;
  } catch {}

  if (!isOpen) return null;

  const handleWatchAd = async () => {
    if (watchAd) {
      const success = await watchAd();
      if (success) {
        // Unlock all features for 24 hours
        unlockFeatureTemporarily('friend_leaderboard');
        unlockFeatureTemporarily('strength_bw_ratio_chart');
        unlockFeatureTemporarily('export_pr_data');
        unlockFeatureTemporarily('overlay_charts');
        unlockFeatureTemporarily('bw_trendline');
        unlockFeatureTemporarily('achievements');
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-dark-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 pb-10 safe-bottom border-t border-dark-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none px-1">
            &times;
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block bg-primary/20 rounded-full px-4 py-1.5 mb-3">
            <span className="text-primary font-display font-extrabold text-xl uppercase tracking-wider">
              StrengthCharts Pro
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Unlock the full power of your training data.
          </p>
        </div>

        {/* Pricing Plans */}
        <div className="space-y-2 mb-6">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                selectedPlan === plan.id
                  ? 'border-primary bg-primary/10'
                  : 'border-dark-500 bg-dark-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === plan.id ? 'border-primary' : 'border-gray-500'
                }`}>
                  {selectedPlan === plan.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="text-left">
                  <span className={`font-display font-bold text-sm uppercase ${
                    selectedPlan === plan.id ? 'text-white' : 'text-gray-400'
                  }`}>
                    {plan.label}
                  </span>
                  {plan.badge && (
                    <span className="ml-2 text-[9px] font-display font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                      {plan.badge}
                    </span>
                  )}
                </div>
              </div>
              <span className={`font-display font-extrabold text-lg ${
                selectedPlan === plan.id ? 'text-primary' : 'text-gray-400'
              }`}>
                {plan.price}<span className="text-xs text-gray-500">{plan.period}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Feature list */}
        <div className="space-y-3 mb-8">
          {FEATURES.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-primary text-lg leading-none mt-0.5">&#10003;</span>
              <span className="text-white text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {isPremium ? (
          <div className="bg-primary/10 text-primary text-center py-3 rounded-lg font-display font-bold uppercase">
            You're Already Pro!
          </div>
        ) : isNative ? (
          <>
            <button
              onClick={purchasePro}
              disabled={purchasing || !product}
              className="btn-primary w-full mb-3"
            >
              {purchasing
                ? 'Processing...'
                : `Upgrade — ${PLANS.find(p => p.id === selectedPlan)?.price || '...'}`}
            </button>

            {watchAd && (
              <button
                onClick={handleWatchAd}
                className="w-full py-3 rounded-xl bg-dark-700 border border-dark-500 text-gray-300 font-display font-bold text-sm uppercase mb-3 active:scale-95 transition-transform"
              >
                Watch Ad — Unlock 24hrs Free
              </button>
            )}

            <button
              onClick={restorePurchases}
              disabled={restoring}
              className="w-full text-center text-gray-500 text-xs py-2"
            >
              {restoring ? 'Restoring...' : 'Restore Purchases'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center mb-3">
              <p className="text-primary font-display font-bold text-lg mb-1">
                {PLANS.find(p => p.id === selectedPlan)?.price}{PLANS.find(p => p.id === selectedPlan)?.period}
              </p>
              <p className="text-gray-400 text-xs">
                Pro upgrades are available in the iOS app.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
