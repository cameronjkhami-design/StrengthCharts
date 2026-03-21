import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { usePremium, PREMIUM_FEATURES } from '../context/PremiumContext';
import { api } from '../utils/api';
import { getTier, calcE1RM, getPercentile, MAIN_LIFTS } from '../utils/benchmarks';
import { formatWeight, kgToDisplay, formatDateShort } from '../utils/conversions';
import TierBadge from '../components/TierBadge';
import ProgressBar from '../components/ProgressBar';
import PremiumGate, { ProTag } from '../components/PremiumGate';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getPrimaryColor } from '../utils/colors';

export default function Dashboard() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { addNotification } = useNotification();
  const [prs, setPrs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [bodyweight, setBodyweight] = useState(null);
  const [loading, setLoading] = useState(true);

  // Workout tracker (localStorage)
  const [workoutDays, setWorkoutDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sc_workout_days')) || []; } catch { return []; }
  });
  const todayStr = new Date().toISOString().split('T')[0];
  const workedOutToday = workoutDays.includes(todayStr);
  const handleToggleWorkout = () => {
    let next;
    if (workedOutToday) {
      next = workoutDays.filter(d => d !== todayStr);
    } else {
      next = [...workoutDays, todayStr];
    }
    setWorkoutDays(next);
    localStorage.setItem('sc_workout_days', JSON.stringify(next));
    if (!workedOutToday) addNotification('Workout logged! Keep it up!', 'success');
  };
  const getConsistency = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const liftDays = new Set();
    for (const log of allLogs) {
      const d = new Date(log.logged_at).toISOString().split('T')[0];
      if (new Date(d) >= sevenDaysAgo) liftDays.add(d);
    }
    return new Set([...workoutDays.filter(d => new Date(d) >= sevenDaysAgo), ...liftDays]).size;
  };

  const unit = user?.unit_pref || 'lbs';

  useEffect(() => {
    async function load() {
      try {
        const [prData, bwData, logsData] = await Promise.all([
          api.getPRs(user.id),
          api.getLatestBodyweight(user.id),
          api.getLifts(user.id),
        ]);
        setPrs(prData.prs);
        setBodyweight(bwData.log);
        setAllLogs(logsData.logs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  const bwKg = bodyweight?.weight_kg;

  const liftCards = MAIN_LIFTS.map(liftName => {
    const pr = prs.find(p => p.exercise_name === liftName);
    const e1rm = pr ? calcE1RM(pr.weight_kg, pr.reps) : 0;
    const ratio = bwKg ? e1rm / bwKg : 0;
    const tierInfo = getTier(liftName, ratio);

    const percentile = bwKg ? getPercentile(liftName, ratio) : null;
    return { liftName, pr, e1rm, ratio, tierInfo, percentile };
  }).filter(c => c.pr);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-gray-500 text-sm uppercase tracking-wider">Welcome back</p>
          <h1 className="font-display font-extrabold text-3xl text-white">
            {user.display_name || user.username}
          </h1>
        </div>
        {bwKg && (
          <div className="text-right">
            <p className="text-gray-500 text-xs uppercase">Bodyweight</p>
            <p className="font-display font-bold text-xl text-white">
              {formatWeight(bwKg, unit)}
            </p>
          </div>
        )}
      </div>

      {/* Workout Tracker */}
      {(() => {
        const consistencyDays = getConsistency();
        const consistencyRating = consistencyDays >= 6 ? 'Elite' : consistencyDays >= 4 ? 'Strong' : consistencyDays >= 2 ? 'Building' : consistencyDays >= 1 ? 'Starting' : 'Rest Week';
        const consistencyColor = consistencyDays >= 6 ? '#f59e0b' : consistencyDays >= 4 ? '#22c55e' : consistencyDays >= 2 ? '#3b82f6' : consistencyDays >= 1 ? '#6b7280' : '#4b5563';
        return (
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Workout Tracker
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display font-bold uppercase px-2 py-0.5 rounded-full" style={{ color: consistencyColor, backgroundColor: consistencyColor + '20', border: `1px solid ${consistencyColor}40` }}>
                  {consistencyRating}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-dark-700 rounded-xl mb-3">
              <div>
                <p className="text-white text-sm font-display font-bold">
                  {workedOutToday ? "Today's workout" : 'Did you work out today?'}
                </p>
                <p className="text-gray-500 text-[10px]">{consistencyDays}/7 days this week</p>
              </div>
              <button
                onClick={handleToggleWorkout}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                  workedOutToday ? 'bg-green-500/20 border-2 border-green-500' : 'bg-dark-600 border-2 border-dark-500'
                }`}
              >
                <svg viewBox="0 0 24 24" className={`w-6 h-6 ${workedOutToday ? 'text-green-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-1.5 justify-between">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                const d = new Date();
                d.setDate(d.getDate() - d.getDay() + i);
                const dateStr = d.toISOString().split('T')[0];
                const isActive = workoutDays.includes(dateStr) || allLogs.some(l => l.logged_at?.startsWith(dateStr));
                const isToday = dateStr === todayStr;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-gray-500 text-[9px] font-display font-bold">{day}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-display font-bold ${
                      isActive ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                      isToday ? 'bg-dark-600 text-gray-400 border border-primary/30' :
                      'bg-dark-700 text-gray-600 border border-dark-600'
                    }`}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Quick Actions */}
      <Link to="/log" className="btn-primary w-full block text-center mb-3">
        + Log New Lift
      </Link>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/plate-calculator" className="btn-secondary block text-center flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="12" y1="8" x2="12" y2="16" />
          </svg>
          Plate Calc
        </Link>
        <Link to="/challenges" className="btn-secondary block text-center flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2L6 14h8L13.5 22 22 10h-8z" />
          </svg>
          Challenges
        </Link>
      </div>

      {/* No data state */}
      {liftCards.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-gray-400 mb-2">No lifts logged yet</p>
          <p className="text-gray-600 text-sm">Tap "Log New Lift" to get started</p>
        </div>
      )}

      {/* Exercise Comparison Chart (Premium) — works with any available lifts */}
      {liftCards.length >= 1 && (
        <PremiumGate featureId={PREMIUM_FEATURES.OVERLAY_CHARTS} blurContent>
          <div className="card mb-6">
            <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-2 flex items-center gap-2">
              Exercise Comparison
              <ProTag />
            </h3>
            <OverlayChart logs={allLogs} unit={unit} />
          </div>
        </PremiumGate>
      )}

      {/* Lift Summary Cards */}
      <div className="space-y-3">
        {liftCards.map(({ liftName, pr, e1rm, ratio, tierInfo, percentile }) => (
          <div key={liftName} className="card">
            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-lg uppercase text-white truncate">{liftName}</h3>
                <p className="text-gray-500 text-xs">
                  Best: {formatWeight(pr.weight_kg, unit)} x {pr.reps}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="font-display font-extrabold text-2xl text-primary">
                  {kgToDisplay(e1rm, unit)}
                  <span className="text-sm text-gray-400 ml-1">{unit}</span>
                </p>
                <p className="text-gray-500 text-[10px] uppercase">Est. 1RM</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <TierBadge tier={tierInfo.tier} size="sm" />
              {bwKg && (
                <span className="text-gray-500 text-xs">
                  {ratio.toFixed(2)}x BW
                </span>
              )}
              {percentile && (
                <span className="text-primary/80 text-xs font-display font-bold">
                  Top {100 - percentile}%
                </span>
              )}
            </div>

            {tierInfo.nextTier && (
              <ProgressBar
                progress={tierInfo.progress}
                color={tierInfo.color}
                sublabel={`${tierInfo.progress}% to ${tierInfo.nextTier}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Overlay chart component for exercise comparison — pro users can pick up to 3 lifts
function OverlayChart({ logs, unit }) {
  const COLORS_PALETTE = [getPrimaryColor(), '#3b82f6', '#ef4444', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];

  // Discover all exercises with data
  const exerciseSet = new Set();
  for (const log of logs) {
    exerciseSet.add(log.exercise_name);
  }
  const availableExercises = Array.from(exerciseSet);

  // Selected lifts (persisted in localStorage, max 3)
  const [selectedLifts, setSelectedLifts] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sc_chart_lifts'));
      if (Array.isArray(saved) && saved.length > 0) {
        // Filter to only exercises that still have data
        const valid = saved.filter(ex => exerciseSet.has(ex));
        if (valid.length > 0) return valid.slice(0, 3);
      }
    } catch {}
    // Default: first 3 available exercises
    return availableExercises.slice(0, 3);
  });

  const toggleLift = (exercise) => {
    setSelectedLifts(prev => {
      let next;
      if (prev.includes(exercise)) {
        next = prev.filter(e => e !== exercise);
      } else if (prev.length >= 3) {
        // Replace oldest selection
        next = [...prev.slice(1), exercise];
      } else {
        next = [...prev, exercise];
      }
      localStorage.setItem('sc_chart_lifts', JSON.stringify(next));
      return next;
    });
  };

  const COLORS = {};
  availableExercises.forEach((ex, i) => {
    COLORS[ex] = COLORS_PALETTE[i % COLORS_PALETTE.length];
  });

  const displayedLifts = selectedLifts.length > 0 ? selectedLifts : availableExercises.slice(0, 3);

  // Group logs by time period and exercise, compute best e1rm per period
  // First try monthly grouping; if < 2 data points, fall back to weekly
  const groupLogs = (periodFn, labelFn) => {
    const byPeriod = {};
    for (const log of logs) {
      if (!displayedLifts.includes(log.exercise_name)) continue;
      const d = new Date(log.logged_at);
      const key = periodFn(d);
      if (!byPeriod[key]) byPeriod[key] = {};
      const e1rm = calcE1RM(log.weight_kg, log.reps);
      const displayed = kgToDisplay(e1rm, unit);
      if (!byPeriod[key][log.exercise_name] || displayed > byPeriod[key][log.exercise_name]) {
        byPeriod[key][log.exercise_name] = displayed;
      }
    }
    return Object.keys(byPeriod).sort().map(key => ({
      month: labelFn(key),
      ...byPeriod[key],
    }));
  };

  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = (k) => k.slice(5) + '/' + k.slice(2, 4);
  const weekKey = (d) => {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return start.toISOString().split('T')[0];
  };
  const weekLabel = (k) => k.slice(5); // MM-DD

  let data = groupLogs(monthKey, monthLabel);
  if (data.length < 2) {
    data = groupLogs(weekKey, weekLabel);
  }

  if (data.length < 1) return <p className="text-gray-500 text-xs text-center py-4">Need more data for comparison</p>;

  return (
    <div>
      {/* Lift selector pills */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {availableExercises.map(ex => (
          <button
            key={ex}
            onClick={() => toggleLift(ex)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-display font-bold uppercase transition-all ${
              selectedLifts.includes(ex)
                ? 'bg-transparent scale-105'
                : 'bg-dark-700 text-gray-400 border border-dark-500'
            }`}
            style={selectedLifts.includes(ex) ? { color: COLORS[ex], borderWidth: '1.5px', borderStyle: 'solid', borderColor: COLORS[ex] } : undefined}
          >
            {ex}
          </button>
        ))}
      </div>
      <p className="text-gray-600 text-[10px] mb-2">Tap to select up to 3 exercises</p>

      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#3a3a3a' }} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
            {displayedLifts.map(lift => (
              <Line key={lift} type="monotone" dataKey={lift} stroke={COLORS[lift]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
