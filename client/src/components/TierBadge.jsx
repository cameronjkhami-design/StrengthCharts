import { TIER_COLORS } from '../utils/benchmarks';

export default function TierBadge({ tier, size = 'md' }) {
  const color = TIER_COLORS[tier] || '#6b7280';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`font-display font-bold uppercase tracking-wider rounded ${sizeClasses[size]}`}
      style={{ backgroundColor: color + '22', color, border: `1px solid ${color}55` }}
    >
      {tier}
    </span>
  );
}
