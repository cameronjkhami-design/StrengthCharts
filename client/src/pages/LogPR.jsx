import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { inputToKg } from '../utils/conversions';
import { DEFAULT_EXERCISES } from '../utils/benchmarks';

export default function LogPR() {
  const { user } = useAuth();
  const unit = user?.unit_pref || 'lbs';

  const [exercise, setExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedExercise = exercise === '__custom__' ? customExercise : exercise;

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
      });
      setSuccess(true);
      setWeight('');
      setReps('');
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
    ? Math.round(weightNum * (1 + repsNum / 30) * 10) / 10
    : null;

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="font-display font-extrabold text-3xl text-white mb-6">LOG PR</h1>

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
            className="input-field"
          />
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
            PR Logged!
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Log PR'}
        </button>
      </form>
    </div>
  );
}
