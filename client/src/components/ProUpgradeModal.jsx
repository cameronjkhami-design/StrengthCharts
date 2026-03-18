import { usePurchases } from '../hooks/usePurchases';
import { usePremium } from '../context/PremiumContext';

const FEATURES = [
  'Strength-to-bodyweight ratio trend charts',
  'Full leaderboard access (all ranks)',
  'Export your PR data',
  'Overlay multiple exercise charts',
  'No ads — ever',
];

export default function ProUpgradeModal({ isOpen, onClose }) {
  const { product, purchasing, restoring, purchasePro, restorePurchases, isNative } = usePurchases();
  const { isPremium } = usePremium();

  if (!isOpen) return null;

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
                : `Upgrade for ${product?.price || '...'}`}
            </button>

            <button
              onClick={restorePurchases}
              disabled={restoring}
              className="w-full text-center text-gray-500 text-xs py-2"
            >
              {restoring ? 'Restoring...' : 'Restore Purchases'}
            </button>
          </>
        ) : (
          <p className="text-gray-500 text-sm text-center">
            Pro upgrades are available in the iOS app.
          </p>
        )}
      </div>
    </div>
  );
}
