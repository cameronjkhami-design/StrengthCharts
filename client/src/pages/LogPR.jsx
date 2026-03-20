import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { inputToKg, kgToDisplay } from '../utils/conversions';
import { DEFAULT_EXERCISES } from '../utils/benchmarks';
import { useNotification } from '../context/NotificationContext';

function triggerHeavyHaptic() {
  if (window.Capacitor?.isNativePlatform()) {
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

export default function LogPR() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const unit = user?.unit_pref || 'lbs';

  const [exercise, setExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [lastWeight, setLastWeight] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  const selectedExercise = exercise === '__custom__' ? customExercise : exercise;

  // Fetch last logged weight when exercise changes
  useEffect(() => {
    if (!selectedExercise || !user?.id) {
      setLastWeight(null);
      setSuggestion(null);
      return;
    }
    api.getExerciseLogs(user.id, selectedExercise).then(logs => {
      if (logs.length > 0) {
        const latest = logs[0]; // most recent
        const displayWeight = kgToDisplay(latest.weight_kg, unit);
        setLastWeight(displayWeight);
        const bump = unit === 'kg' ? 2.5 : 5;
        setSuggestion(Math.round(displayWeight + bump));
      } else {
        setLastWeight(null);
        setSuggestion(null);
      }
    }).catch(() => {});
  }, [selectedExercise, user?.id, unit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!selectedExercise) {
      setError('Please select or enter an exercise');
      return;
    }

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);

    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Please enter a valid weight');
      return;
    }
    if (isNaN(repsNum) || repsNum <= 0) {
      setError('Please enter valid reps');
      return;
    }

    setLoading(true);
    try {
      await api.logLift({
        user_id: user.id,
        exercise_name: selectedExercise,
        weight_kg: inputToKg(weightNum, unit),
        reps: repsNum,
        logged_at: new Date(date).toISOString(),
        notes: notes || null,
        rpe: rpe ? parseFloat(rpe) : null,
      });
      setSuccess(true);
      triggerHeavyHaptic();
      addNotification(`${selectedExercise} logged!`, 'success');

      // Progressive overload encouragement
      const loggedWeight = parseFloat(weight);
      if (lastWeight && loggedWeight >= lastWeight) {
        const bump = unit === 'kg' ? 2.5 : 5;
        const nextTarget = Math.round(loggedWeight + bump);
        setTimeout(() => {
          addNotification(`Next goal: ${nextTarget} ${unit} — keep pushing!`, 'info');
        }, 1500);
      }

      setWeight('');
      setReps('');
      setRpe('');
      setNotes('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Estimate 1RM preview
  const weightNum = parseFloat(weight);
  const repsNum = parseInt(reps);
  const e1rmPreview = !isNaN(weightNum) && !isNaN(repsNum) && repsNum > 0
    ? Math.round(repsNum === 1 ? weightNum : weightNum * (1 + repsNum / 30))
    : null;

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      <h1 className="font-display font-extrabold text-3xl text-white mb-6">LOG LIFT</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Exercise Select */}
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">Exercise</label>
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            className="input-field"
          >
            <option value="">Select exercise...</option>
            {DEFAULT_EXERCISES.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
            <option value="__custom__">+ Custom Exercise</option>
          </select>
        </div>

        {suggestion && (
          <div
            className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setWeight(String(suggestion))}
          >
            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-display font-bold uppercase">Progressive Overload</p>
              <p className="text-gray-300 text-sm">Last: {lastWeight} {unit} — Try <span className="text-primary font-bold">{suggestion} {unit}</span></p>
            </div>
            <span className="text-primary text-lg ml-2 flex-shrink-0">↑</span>
          </div>
        )}

        {exercise === '__custom__' && (
          <div>
            <input
              type="text"
              placeholder="Exercise name"
              value={customExercise}
              onChange={(e) => setCustomExercise(e.target.value)}
              className="input-field"
            />
          </div>
        )}

        {/* Weight + Reps */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
              Weight ({unit})
            </label>
            <input
              type="number"
              placeholder="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input-field font-display text-2xl text-center"
              inputMode="decimal"
              step="any"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">Reps</label>
            <input
              type="number"
              placeholder="0"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="input-field font-display text-2xl text-center"
              inputMode="numeric"
              min="1"
            />
          </div>
        </div>

        {/* E1RM Preview */}
        {e1rmPreview && (
          <div className="card bg-dark-700 text-center">
            <p className="text-gray-500 text-xs uppercase">Estimated 1RM</p>
            <p className="font-display font-extrabold text-3xl text-primary">
              {e1rmPreview} <span className="text-lg text-gray-400">{unit}</span>
            </p>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-full box-border appearance-none"
            style={{ maxWidth: '100%', minHeight: '48px', WebkitAppearance: 'none' }}
          />
        </div>

        {/* RPE (optional) */}
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
            RPE (optional)
          </label>
          <div className="grid grid-cols-9 gap-1">
            {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setRpe(rpe === String(val) ? '' : String(val))}
                className={`py-2 rounded-lg text-[10px] font-display font-bold transition-all ${
                  rpe === String(val)
                    ? 'bg-primary text-dark-900 scale-105'
                    : 'bg-dark-700 text-gray-400 border border-dark-500'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          {rpe && (
            <p className="text-gray-500 text-[10px] mt-1 text-center">
              {parseFloat(rpe) <= 7 ? 'Could do 3+ more reps' : parseFloat(rpe) <= 8 ? 'Could do 2 more reps' : parseFloat(rpe) <= 9 ? 'Could do 1 more rep' : parseFloat(rpe) >= 10 ? 'Max effort — nothing left' : 'Almost max effort'}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
            Notes (optional)
          </label>
          <textarea
            placeholder="How did it feel?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field resize-none h-20"
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {success && (
          <div className="bg-green-900/30 border border-green-700 text-green-400 text-center py-3 rounded-lg font-display font-bold uppercase">
            Lift Logged!
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Log Lift'}
        </button>
      </form>
    </div>
  );
}
