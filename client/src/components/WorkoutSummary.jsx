import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { kgToDisplay, formatWeight } from '../utils/conversions';
import { calcE1RM } from '../utils/benchmarks';
import { getPrimaryColor } from '../utils/colors';

// Map exercises to muscle groups for the body map
const EXERCISE_MUSCLES = {
  'Squat': ['quads', 'glutes', 'core'],
  'Bench Press': ['chest', 'triceps', 'shoulders'],
  'Deadlift': ['back', 'glutes', 'hamstrings', 'core'],
  'Overhead Press': ['shoulders', 'triceps', 'core'],
  'Barbell Row': ['back', 'biceps'],
  'Pull-ups': ['back', 'biceps'],
  'Incline DB Press': ['chest', 'shoulders', 'triceps'],
  'Incline Bench Press': ['chest', 'shoulders', 'triceps'],
  'Pendulum Squat': ['quads', 'glutes'],
  'Hack Squat': ['quads', 'glutes'],
  'Romanian Deadlift': ['hamstrings', 'glutes', 'back'],
  'Front Squat': ['quads', 'core'],
  'Lat Pulldown': ['back', 'biceps'],
  'Dumbbell Curl': ['biceps'],
  'EZ Bar Biceps Curl': ['biceps'],
  'Dumbbell Shoulder Press': ['shoulders', 'triceps'],
  'Leg Press': ['quads', 'glutes'],
  'Cable Row': ['back', 'biceps'],
  'Hip Thrust': ['glutes', 'hamstrings'],
  'Tricep Pushdown': ['triceps'],
  'Lateral Raise': ['shoulders'],
  'Face Pull': ['shoulders', 'back'],
  'Leg Extension': ['quads'],
  'Leg Curl': ['hamstrings'],
  'Calf Raise': ['calves'],
};

// Fun volume comparisons
function getVolumeComparison(volumeLbs) {
  const comparisons = [
    { threshold: 500, text: "That's like lifting a grand piano!", icon: 'piano' },
    { threshold: 1000, text: "That's like lifting a horse!", icon: 'horse' },
    { threshold: 2000, text: "That's like lifting a motorcycle!", icon: 'motorcycle' },
    { threshold: 5000, text: "That's like lifting a car!", icon: 'car' },
    { threshold: 10000, text: "That's like lifting an elephant!", icon: 'elephant' },
    { threshold: 20000, text: "That's like lifting a school bus!", icon: 'bus' },
    { threshold: 50000, text: "That's like lifting a whale!", icon: 'whale' },
    { threshold: 100000, text: "That's like lifting a space shuttle!", icon: 'shuttle' },
  ];

  for (let i = comparisons.length - 1; i >= 0; i--) {
    if (volumeLbs >= comparisons[i].threshold) {
      return comparisons[i];
    }
  }
  return { text: "Every rep counts!", icon: 'star' };
}

// Simple body map SVG component
function BodyMap({ activeMuscles }) {
  const muscleColors = {
    chest: activeMuscles.includes('chest'),
    shoulders: activeMuscles.includes('shoulders'),
    back: activeMuscles.includes('back'),
    biceps: activeMuscles.includes('biceps'),
    triceps: activeMuscles.includes('triceps'),
    core: activeMuscles.includes('core'),
    quads: activeMuscles.includes('quads'),
    hamstrings: activeMuscles.includes('hamstrings'),
    glutes: activeMuscles.includes('glutes'),
    calves: activeMuscles.includes('calves'),
  };

  const active = getPrimaryColor();
  const inactive = '#2a2a2a';

  return (
    <div className="flex justify-center gap-6">
      {/* Front view */}
      <svg viewBox="0 0 100 180" className="w-20 h-36">
        {/* Head */}
        <circle cx="50" cy="15" r="10" fill="#444" />
        {/* Neck */}
        <rect x="46" y="25" width="8" height="6" fill="#444" />
        {/* Shoulders */}
        <ellipse cx="30" cy="38" rx="12" ry="6" fill={muscleColors.shoulders ? active : inactive} />
        <ellipse cx="70" cy="38" rx="12" ry="6" fill={muscleColors.shoulders ? active : inactive} />
        {/* Chest */}
        <ellipse cx="40" cy="48" rx="10" ry="8" fill={muscleColors.chest ? active : inactive} />
        <ellipse cx="60" cy="48" rx="10" ry="8" fill={muscleColors.chest ? active : inactive} />
        {/* Core */}
        <rect x="40" y="56" width="20" height="20" rx="3" fill={muscleColors.core ? active : inactive} />
        {/* Biceps */}
        <ellipse cx="22" cy="55" rx="5" ry="12" fill={muscleColors.biceps ? active : inactive} />
        <ellipse cx="78" cy="55" rx="5" ry="12" fill={muscleColors.biceps ? active : inactive} />
        {/* Triceps (visible from front as outer arm) */}
        <ellipse cx="18" cy="58" rx="3" ry="10" fill={muscleColors.triceps ? active : inactive} opacity="0.6" />
        <ellipse cx="82" cy="58" rx="3" ry="10" fill={muscleColors.triceps ? active : inactive} opacity="0.6" />
        {/* Forearms */}
        <rect x="18" y="68" width="6" height="16" rx="3" fill="#444" />
        <rect x="76" y="68" width="6" height="16" rx="3" fill="#444" />
        {/* Quads */}
        <ellipse cx="42" cy="95" rx="8" ry="16" fill={muscleColors.quads ? active : inactive} />
        <ellipse cx="58" cy="95" rx="8" ry="16" fill={muscleColors.quads ? active : inactive} />
        {/* Knees */}
        <circle cx="42" cy="115" r="4" fill="#444" />
        <circle cx="58" cy="115" r="4" fill="#444" />
        {/* Calves */}
        <ellipse cx="42" cy="135" rx="5" ry="14" fill={muscleColors.calves ? active : inactive} />
        <ellipse cx="58" cy="135" rx="5" ry="14" fill={muscleColors.calves ? active : inactive} />
        {/* Feet */}
        <ellipse cx="42" cy="155" rx="5" ry="3" fill="#444" />
        <ellipse cx="58" cy="155" rx="5" ry="3" fill="#444" />
        {/* Label */}
        <text x="50" y="172" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="sans-serif">FRONT</text>
      </svg>

      {/* Back view */}
      <svg viewBox="0 0 100 180" className="w-20 h-36">
        {/* Head */}
        <circle cx="50" cy="15" r="10" fill="#444" />
        {/* Neck */}
        <rect x="46" y="25" width="8" height="6" fill="#444" />
        {/* Traps/shoulders */}
        <ellipse cx="30" cy="38" rx="12" ry="6" fill={muscleColors.shoulders ? active : inactive} />
        <ellipse cx="70" cy="38" rx="12" ry="6" fill={muscleColors.shoulders ? active : inactive} />
        {/* Back */}
        <rect x="34" y="38" width="32" height="24" rx="4" fill={muscleColors.back ? active : inactive} />
        {/* Lower back */}
        <rect x="38" y="62" width="24" height="14" rx="3" fill={muscleColors.back ? active : inactive} opacity="0.7" />
        {/* Triceps */}
        <ellipse cx="22" cy="55" rx="5" ry="12" fill={muscleColors.triceps ? active : inactive} />
        <ellipse cx="78" cy="55" rx="5" ry="12" fill={muscleColors.triceps ? active : inactive} />
        {/* Forearms */}
        <rect x="18" y="68" width="6" height="16" rx="3" fill="#444" />
        <rect x="76" y="68" width="6" height="16" rx="3" fill="#444" />
        {/* Glutes */}
        <ellipse cx="42" cy="82" rx="8" ry="6" fill={muscleColors.glutes ? active : inactive} />
        <ellipse cx="58" cy="82" rx="8" ry="6" fill={muscleColors.glutes ? active : inactive} />
        {/* Hamstrings */}
        <ellipse cx="42" cy="100" rx="7" ry="14" fill={muscleColors.hamstrings ? active : inactive} />
        <ellipse cx="58" cy="100" rx="7" ry="14" fill={muscleColors.hamstrings ? active : inactive} />
        {/* Knees */}
        <circle cx="42" cy="115" r="4" fill="#444" />
        <circle cx="58" cy="115" r="4" fill="#444" />
        {/* Calves */}
        <ellipse cx="42" cy="135" rx="5" ry="14" fill={muscleColors.calves ? active : inactive} />
        <ellipse cx="58" cy="135" rx="5" ry="14" fill={muscleColors.calves ? active : inactive} />
        {/* Feet */}
        <ellipse cx="42" cy="155" rx="5" ry="3" fill="#444" />
        <ellipse cx="58" cy="155" rx="5" ry="3" fill="#444" />
        {/* Label */}
        <text x="50" y="172" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="sans-serif">BACK</text>
      </svg>
    </div>
  );
}

export default function WorkoutSummary({ isOpen, onClose, sessionLogs = [] }) {
  const { user } = useAuth();
  const unit = user?.unit_pref || 'lbs';
  const [page, setPage] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);

  // Count total workouts
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const workoutDays = (() => {
      try { return JSON.parse(localStorage.getItem('sc_workout_days')) || []; } catch { return []; }
    })();
    // Count unique workout days from lift logs + manual days
    api.getLifts(user.id).then(data => {
      const allDays = new Set([
        ...workoutDays,
        ...data.logs.map(l => l.logged_at?.split('T')[0]).filter(Boolean),
      ]);
      setWorkoutCount(allDays.size);
    }).catch(() => setWorkoutCount(workoutDays.length));
  }, [isOpen, user?.id]);

  if (!isOpen || sessionLogs.length === 0) return null;

  // Calculate stats
  const totalSets = sessionLogs.length;
  const exercises = [...new Set(sessionLogs.map(l => l.exercise_name))];
  const totalVolumeKg = sessionLogs.reduce((sum, l) => sum + l.weight_kg * l.reps, 0);
  const totalVolumeLbs = Math.round(totalVolumeKg * 2.20462);
  const displayVolume = unit === 'lbs' ? totalVolumeLbs : Math.round(totalVolumeKg);
  const comparison = getVolumeComparison(totalVolumeLbs);

  // Session duration from timestamps
  const timestamps = sessionLogs
    .map(l => new Date(l.logged_at).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);
  const durationMs = timestamps.length >= 2
    ? timestamps[timestamps.length - 1] - timestamps[0]
    : 0;
  const durationMin = Math.max(1, Math.round(durationMs / 60000));

  // Muscle groups worked
  const activeMuscles = [...new Set(
    exercises.flatMap(ex => EXERCISE_MUSCLES[ex] || [])
  )];

  // Check for PRs in this session
  const sessionPRs = [];

  const pages = [
    // Page 0: Main summary
    () => (
      <div className="text-center">
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-1">Nice work!</p>
          <p className="text-gray-500 text-xs">This is your {workoutCount}{getOrdinalSuffix(workoutCount)} workout</p>
        </div>

        <div className="bg-dark-700/60 backdrop-blur-sm rounded-2xl p-5 border border-dark-500/50">
          <h2 className="font-display font-extrabold text-2xl text-white mb-4">
            Workout Complete
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="font-display font-extrabold text-2xl text-primary">{durationMin}</p>
              <p className="text-gray-400 text-[10px] uppercase">min</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-white">{displayVolume.toLocaleString()}</p>
              <p className="text-gray-400 text-[10px] uppercase">{unit}</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl text-white">{totalSets}</p>
              <p className="text-gray-400 text-[10px] uppercase">sets</p>
            </div>
          </div>

          <div className="space-y-1">
            {exercises.map(ex => {
              const count = sessionLogs.filter(l => l.exercise_name === ex).length;
              return (
                <div key={ex} className="flex items-center gap-2 text-left">
                  <span className="text-primary text-xs font-display font-bold">{count}x</span>
                  <span className="text-gray-300 text-sm">{ex}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),

    // Page 1: Muscle map
    () => (
      <div className="text-center">
        <div className="bg-dark-700/60 backdrop-blur-sm rounded-2xl p-5 border border-dark-500/50">
          <h2 className="font-display font-extrabold text-xl text-white mb-4">
            Muscles Worked
          </h2>
          <BodyMap activeMuscles={activeMuscles} />
          <div className="flex flex-wrap gap-1.5 justify-center mt-4">
            {activeMuscles.map(m => (
              <span
                key={m}
                className="text-[10px] font-display font-bold uppercase px-2.5 py-1 rounded-full"
                style={{ color: getPrimaryColor(), backgroundColor: getPrimaryColor() + '20', border: `1px solid ${getPrimaryColor()}40` }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),

    // Page 2: Volume comparison
    () => (
      <div className="text-center">
        <div className="bg-dark-700/60 backdrop-blur-sm rounded-2xl p-5 border border-dark-500/50">
          <p className="text-gray-400 text-sm mb-2">You lifted a total of</p>
          <p className="font-display font-extrabold text-5xl text-white mb-2">
            {displayVolume.toLocaleString()} <span className="text-2xl text-gray-400">{unit}</span>
          </p>
          <p className="text-gray-300 text-sm mb-6">{comparison.text}</p>

          {/* Fun icon based on comparison */}
          <div className="text-6xl mb-4">
            {comparison.icon === 'piano' && '🎹'}
            {comparison.icon === 'horse' && '🐎'}
            {comparison.icon === 'motorcycle' && '🏍️'}
            {comparison.icon === 'car' && '🚗'}
            {comparison.icon === 'elephant' && '🐘'}
            {comparison.icon === 'bus' && '🚌'}
            {comparison.icon === 'whale' && '🐋'}
            {comparison.icon === 'shuttle' && '🚀'}
            {comparison.icon === 'star' && '💪'}
          </div>
        </div>
      </div>
    ),

    // Page 3: Set-by-set breakdown
    () => (
      <div className="text-center">
        <div className="bg-dark-700/60 backdrop-blur-sm rounded-2xl p-5 border border-dark-500/50">
          <h2 className="font-display font-extrabold text-xl text-white mb-4">
            Session Details
          </h2>
          <div className="space-y-3 text-left max-h-64 overflow-y-auto">
            {exercises.map(ex => {
              const exLogs = sessionLogs.filter(l => l.exercise_name === ex);
              return (
                <div key={ex}>
                  <p className="text-primary text-xs font-display font-bold uppercase mb-1">{ex}</p>
                  <div className="space-y-1">
                    {exLogs.map((log, i) => (
                      <div key={i} className="flex justify-between items-center py-1 px-2 bg-dark-600/50 rounded-lg">
                        <span className="text-gray-400 text-[10px]">Set {i + 1}</span>
                        <span className="text-white text-xs font-display font-semibold">
                          {formatWeight(log.weight_kg, unit)} x {log.reps}
                          {log.rpe && <span className="text-gray-500 ml-1">RPE {log.rpe}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
  ];

  const totalPages = pages.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in bg-dark-900/95" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Content area with swipe */}
      <div
        className="flex-1 flex items-center justify-center w-full px-4 overflow-hidden"
        onTouchStart={(e) => {
          e.currentTarget._touchStartX = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const diff = e.currentTarget._touchStartX - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            if (diff > 0 && page < totalPages - 1) setPage(page + 1);
            if (diff < 0 && page > 0) setPage(page - 1);
          }
        }}
      >
        <div className="w-full max-w-sm">
          {pages[page]()}
        </div>
      </div>

      {/* Page dots */}
      <div className="flex gap-2 justify-center py-4">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className="w-2 h-2 rounded-full transition-all"
            style={i === page ? { backgroundColor: getPrimaryColor(), width: '1rem' } : { backgroundColor: '#3a3a3a' }}
          />
        ))}
      </div>

      {/* Done button */}
      <div className="w-full px-6 pb-6">
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-display font-bold text-lg uppercase transition-all active:scale-95"
          style={{ backgroundColor: getPrimaryColor(), color: '#0a0a0a' }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
