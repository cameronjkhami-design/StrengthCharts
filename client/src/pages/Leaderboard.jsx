import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium, PREMIUM_FEATURES } from '../context/PremiumContext';
import { api } from '../utils/api';
import { getTier } from '../utils/benchmarks';
import { kgToDisplay } from '../utils/conversions';
import TierBadge from '../components/TierBadge';
import PremiumGate, { ProTag } from '../components/PremiumGate';

const SORT_OPTIONS = [
  { key: 'overall', label: 'Overall' },
  { key: 'Squat', label: 'Squat' },
  { key: 'Bench Press', label: 'Bench' },
  { key: 'Deadlift', label: 'Deadlift' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const unit = user?.unit_pref || 'lbs';

  const { hasAccess } = usePremium();
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortBy, setSortBy] = useState('overall');
  const [sortMode, setSortMode] = useState('relative');
  const [loading, setLoading] = useState(true);

  const hasPro = hasAccess(PREMIUM_FEATURES.FRIEND_LEADERBOARD);

  useEffect(() => {
    if (!hasPro) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getLeaderboard(user.id)
      .then(data => setLeaderboard(data.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id, hasPro]);

  const sorted = [...leaderboard].sort((a, b) => {
    if (sortBy === 'overall') {
      return b.total_relative_score - a.total_relative_score;
    }

    const aLift = a.main_lift_scores[sortBy] || { e1rm: 0, ratio: 0 };
    const bLift = b.main_lift_scores[sortBy] || { e1rm: 0, ratio: 0 };

    return sortMode === 'relative'
      ? bLift.ratio - aLift.ratio
      : bLift.e1rm - aLift.e1rm;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      <h1 className="font-display font-extrabold text-3xl text-white mb-4 flex items-center gap-3">
        LEADERBOARD
        <ProTag />
      </h1>

      {!hasPro ? (
        <PremiumGate featureId={PREMIUM_FEATURES.FRIEND_LEADERBOARD}>
          <div />
        </PremiumGate>
      ) : (
        <>
          {/* Sort Options */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-display font-semibold uppercase tracking-wider transition-colors ${
                  sortBy === opt.key
                    ? 'bg-primary text-dark-900'
                    : 'bg-dark-700 text-gray-400 border border-dark-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Absolute / Relative Toggle */}
          {sortBy !== 'overall' && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSortMode('relative')}
                className={`text-xs px-3 py-1.5 rounded font-display font-semibold uppercase ${
                  sortMode === 'relative' ? 'bg-dark-500 text-white' : 'text-gray-500'
                }`}
              >
                BW Relative
              </button>
              <button
                onClick={() => setSortMode('absolute')}
                className={`text-xs px-3 py-1.5 rounded font-display font-semibold uppercase ${
                  sortMode === 'absolute' ? 'bg-dark-500 text-white' : 'text-gray-500'
                }`}
              >
                Absolute
              </button>
            </div>
          )}

          {/* Rankings */}
          <div className="space-y-3">
            {sorted.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.user_id === user.id;

              let displayValue = '';
              let displayLabel = '';
              let tierName = 'Unranked';

              if (sortBy === 'overall') {
                displayValue = entry.total_relative_score.toFixed(2);
                displayLabel = 'Total Score';
              } else {
                const liftScore = entry.main_lift_scores[sortBy];
                if (liftScore) {
                  if (sortMode === 'relative') {
                    displayValue = liftScore.ratio.toFixed(2) + 'x';
                    displayLabel = 'BW Ratio';
                  } else {
                    displayValue = kgToDisplay(liftScore.e1rm, unit).toString();
                    displayLabel = `1RM (${unit})`;
                  }
                  const tierInfo = getTier(sortBy, liftScore.ratio);
                  tierName = tierInfo.tier;
                }
              }

              return (
                <div
                  key={entry.user_id}
                  className={`card flex items-center gap-3 ${isMe ? 'border-primary/40 bg-primary/5' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-extrabold text-xl ${
                    rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                    rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                    rank === 3 ? 'bg-amber-700/20 text-amber-600' :
                    'bg-dark-600 text-gray-500'
                  }`}>
                    {rank}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-display font-bold text-lg uppercase truncate ${isMe ? 'text-primary' : 'text-white'}`}>
                        {entry.display_name}
                      </p>
                      {isMe && <span className="text-primary text-xs">(you)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {sortBy !== 'overall' && <TierBadge tier={tierName} size="sm" />}
                      {entry.bodyweight_kg && (
                        <span className="text-gray-500 text-xs">
                          {kgToDisplay(entry.bodyweight_kg, unit)} {unit}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-display font-extrabold text-2xl text-white">{displayValue}</p>
                    <p className="text-gray-500 text-[10px] uppercase">{displayLabel}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {sorted.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-gray-400 mb-2">No friends added yet</p>
              <p className="text-gray-600 text-sm">Add friends from your Profile page to see them here</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
