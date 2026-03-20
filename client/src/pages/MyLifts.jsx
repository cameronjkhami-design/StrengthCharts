import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PREMIUM_FEATURES } from '../context/PremiumContext';
import { api } from '../utils/api';
import { getTier, calcE1RM } from '../utils/benchmarks';
import { formatWeight, kgToDisplay, formatDate } from '../utils/conversions';
import { useNotification } from '../context/NotificationContext';
import TierBadge from '../components/TierBadge';
import ProgressBar from '../components/ProgressBar';
import LiftChart from '../components/LiftChart';
import PremiumGate, { ProTag } from '../components/PremiumGate';
import StrengthRatioChart from '../components/StrengthRatioChart';

// Confirmation dialog component
function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 animate-fade-in" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-dark-800 border border-dark-600 rounded-2xl p-5 w-full max-w-sm animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-lg text-white uppercase mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary text-sm py-2.5">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white font-display font-bold text-sm px-6 py-2.5 rounded-lg active:scale-95 transition-transform uppercase tracking-wide"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyLifts() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const unit = user?.unit_pref || 'lbs';

  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [logs, setLogs] = useState([]);
  const [bodyweight, setBodyweight] = useState(null);
  const [loading, setLoading] = useState(true);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'lift'|'category', id, name }
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Delete a single lift
  const handleDeleteLift = (log) => {
    setDeleteTarget({
      type: 'lift',
      id: log.id,
      name: `${formatWeight(log.weight_kg, unit)} x ${log.reps}`,
    });
    setShowDeleteConfirm(true);
  };

  // Delete entire category (all logs for an exercise)
  const handleDeleteCategory = () => {
    setDeleteTarget({
      type: 'category',
      name: selectedExercise,
    });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteTarget.type === 'lift') {
        await api.deleteLift(deleteTarget.id);
        setLogs(prev => prev.filter(l => l.id !== deleteTarget.id));
        addNotification('Lift deleted', 'info');
        // If no logs left, remove from exercises
        if (logs.length <= 1) {
          setExercises(prev => prev.filter(e => e !== selectedExercise));
          setSelectedExercise(exercises.find(e => e !== selectedExercise) || null);
        }
      } else if (deleteTarget.type === 'category') {
        // Delete all logs for this exercise via batch endpoint
        await api.deleteExerciseLogs(user.id, selectedExercise);
        setExercises(prev => prev.filter(e => e !== selectedExercise));
        addNotification(`All ${selectedExercise} logs deleted`, 'info');
        const remaining = exercises.filter(e => e !== selectedExercise);
        setSelectedExercise(remaining[0] || null);
        setLogs([]);
      }
    } catch (err) {
      addNotification('Failed to delete', 'error');
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
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
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-display font-semibold uppercase tracking-wider transition-colors flex-shrink-0 ${
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
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display font-bold text-xl uppercase text-white truncate">
                      {selectedExercise}
                    </h2>
                    {tierInfo && <TierBadge tier={tierInfo.tier} size="sm" />}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
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
                    <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-2 flex items-center gap-2">
                      Strength-to-BW Ratio Trend
                      <ProTag />
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
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-display font-bold text-sm uppercase text-gray-400">
                    History
                  </h3>
                  <button
                    onClick={handleDeleteCategory}
                    className="text-red-400/60 text-[10px] font-display font-bold uppercase flex items-center gap-1 hover:text-red-400 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                    Delete All
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-dark-600 last:border-0 group">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold">
                          {formatWeight(log.weight_kg, unit)} x {log.reps}
                          {log.rpe && <span className="text-gray-500 text-xs ml-2">RPE {log.rpe}</span>}
                        </p>
                        {log.notes && <p className="text-gray-500 text-xs truncate">{log.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-gray-500 text-xs whitespace-nowrap w-[85px] text-right">{formatDate(log.logged_at)}</span>
                        <button
                          onClick={() => handleDeleteLift(log)}
                          className="text-gray-600 hover:text-red-400 transition-colors p-1"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={deleteTarget?.type === 'category' ? 'Delete All Logs?' : 'Delete Lift?'}
        message={
          deleteTarget?.type === 'category'
            ? `This will permanently delete all ${deleteTarget?.name} logs. This action cannot be undone.`
            : `Delete ${deleteTarget?.name}? This action cannot be undone.`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
      />
    </div>
  );
}
