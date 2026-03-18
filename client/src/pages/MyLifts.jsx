import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PREMIUM_FEATURES } from '../context/PremiumContext';
import { api } from '../utils/api';
import { getTier, calcE1RM } from '../utils/benchmarks';
import { formatWeight, kgToDisplay, formatDate } from '../utils/conversions';
import TierBadge from '../components/TierBadge';
import ProgressBar from '../components/ProgressBar';
import LiftChart from '../components/LiftChart';
import PremiumGate from '../components/PremiumGate';
import StrengthRatioChart from '../components/StrengthRatioChart';

export default function MyLifts() {
  const { user } = useAuth();
  const unit = user?.unit_pref || 'lbs';

  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [logs, setLogs] = useState([]);
  const [bodyweight, setBodyweight] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [exData, bwData] = await Promise.all([
          api.getExercises(user.id),
          api.getLatestBodyweight(user.id),
        ]);
        setExercises(exData.exercises);
        setBodyweight(bwData.log);
        if (exData.exercises.length > 0) {
          setSelectedExercise(exData.exercises[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  useEffect(() => {
    if (!selectedExercise) return;
    api.getExerciseLogs(user.id, selectedExercise)
      .then(data => setLogs(data.logs))
      .catch(console.error);
  }, [selectedExercise, user.id]);

  const bwKg = bodyweight?.weight_kg;

  // Calculate best e1rm and rep range breakdown
  const bestE1RM = logs.reduce((best, log) => {
    const e1rm = calcE1RM(log.weight_kg, log.reps);
    return e1rm > best ? e1rm : best;
  }, 0);

  const ratio = bwKg ? bestE1RM / bwKg : 0;
  const tierInfo = selectedExercise ? getTier(selectedExercise, ratio) : null;

  // Rep range breakdown
  const repRanges = {};
  for (const log of logs) {
    let range;
    if (log.reps === 1) range = '1RM';
    else if (log.reps <= 3) range = '2-3RM';
    else if (log.reps <= 5) range = '4-5RM';
    else if (log.reps <= 8) range = '6-8RM';
    else range = '9+RM';

    if (!repRanges[range] || log.weight_kg > repRanges[range].weight_kg) {
      repRanges[range] = log;
    }
  }

  const rangeOrder = ['1RM', '2-3RM', '4-5RM', '6-8RM', '9+RM'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="font-display font-extrabold text-3xl text-white mb-4">MY LIFTS</h1>

      {exercises.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400">No lifts logged yet</p>
        </div>
      ) : (
        <>
          {/* Exercise Selector */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-hide">
            {exercises.map(ex => (
              <button
                key={ex}
                onClick={() => setSelectedExercise(ex)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-display font-semibold uppercase tracking-wider transition-colors ${
                  selectedExercise === ex
                    ? 'bg-primary text-dark-900'
                    : 'bg-dark-700 text-gray-400 border border-dark-500'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>

          {selectedExercise && (
            <>
              {/* Stats Card */}
              <div className="card mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="font-display font-bold text-xl uppercase text-white">
                      {selectedExercise}
                    </h2>
                    {tierInfo && <TierBadge tier={tierInfo.tier} size="sm" />}
                  </div>
                  <div className="text-right">
                    <p className="font-display font-extrabold text-3xl text-primary">
                      {kgToDisplay(bestE1RM, unit)}
                    </p>
                    <p className="text-gray-500 text-[10px] uppercase">Est. 1RM ({unit})</p>
                  </div>
                </div>

                {bwKg && (
                  <p className="text-gray-400 text-sm mb-2">
                    {ratio.toFixed(2)}x bodyweight
                  </p>
                )}

                {tierInfo?.nextTier && (
                  <ProgressBar
                    progress={tierInfo.progress}
                    color={tierInfo.color}
                    label={tierInfo.tier}
                    sublabel={`${tierInfo.progress}% to ${tierInfo.nextTier}`}
                  />
                )}
              </div>

              {/* Chart */}
              <div className="card mb-4">
                <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-2">
                  Progress Over Time
                </h3>
                <LiftChart logs={logs} unit={unit} />
              </div>

              {/* BW Ratio Trend (Premium) */}
              {bwKg && logs.length > 1 && (
                <PremiumGate featureId={PREMIUM_FEATURES.STRENGTH_BW_RATIO_CHART} blurContent>
                  <div className="card mb-4">
                    <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-2">
                      Strength-to-BW Ratio Trend
                    </h3>
                    <StrengthRatioChart logs={logs} bodyweightKg={bwKg} unit={unit} />
                  </div>
                </PremiumGate>
              )}

              {/* Rep Range Breakdown */}
              <div className="card mb-4">
                <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
                  Rep Range Breakdown
                </h3>
                <div className="space-y-2">
                  {rangeOrder.map(range => {
                    const best = repRanges[range];
                    if (!best) return null;
                    return (
                      <div key={range} className="flex justify-between items-center py-2 border-b border-dark-600 last:border-0">
                        <span className="font-display font-bold text-primary text-sm uppercase">{range}</span>
                        <span className="text-white font-display font-semibold">
                          {formatWeight(best.weight_kg, unit)} x {best.reps}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* History */}
              <div className="card">
                <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
                  History
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-dark-600 last:border-0">
                      <div>
                        <p className="text-white text-sm font-semibold">
                          {formatWeight(log.weight_kg, unit)} x {log.reps}
                        </p>
                        {log.notes && <p className="text-gray-500 text-xs">{log.notes}</p>}
                      </div>
                      <span className="text-gray-500 text-xs">{formatDate(log.logged_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
