import { usePremium } from '../context/PremiumContext';

export function ProTag() {
  return (
    <span className="inline-flex items-center bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-[9px] font-display font-bold uppercase px-2 py-0.5 rounded-full tracking-wider border border-primary/20">
      PRO
    </span>
  );
}

export default function PremiumGate({ featureId, children, blurContent = false }) {
  const { hasAccess } = usePremium();

  // All features currently unlocked — just render children
  if (hasAccess(featureId)) {
    return children;
  }

  // Fallback gate (not currently reachable but kept for future use)
  return children;
}
