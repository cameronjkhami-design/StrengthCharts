import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePremium, PREMIUM_FEATURES } from '../context/PremiumContext';
import { api } from '../utils/api';
import { getTier, calcE1RM, getPercentile, MAIN_LIFTS, TIER_ORDER, TIER_COLORS } from '../utils/benchmarks';
import { formatWeight, kgToDisplay, formatDateShort } from '../utils/conversions';
import TierBadge from '../components/TierBadge';
import ProgressBar from '../components/ProgressBar';
import PremiumGate, { ProTag } from '../components/PremiumGate';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getPrimaryColor } from '../utils/colors';

export default function Dashboard() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [prs, setPrs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [bodyweight, setBodyweight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(false);

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

      {/* Quick Log Button */}
      <Link to="/log" className="btn-primary w-full block text-center mb-6">
        + Log New Lift
      </Link>

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

      {/* Benchmark Legend */}
      <div className="card mb-4">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="w-full flex justify-between items-center"
        >
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
            Strength Rankings Legend
          </h3>
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 text-gray-500 transition-transform ${showLegend ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showLegend && (
          <div className="mt-3 space-y-2">
            {TIER_ORDER.map((tier, idx) => {
              const color = TIER_COLORS[tier];
              const pctRanges = ['0-20%', '20-40%', '40-65%', '65-85%', '85-97%', '97-100%'];
              return (
                <div key={tier} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-white text-sm font-display font-semibold uppercase flex-1">{tier}</span>
                  <span className="text-gray-500 text-xs font-display">Top {100 - parseInt(pctRanges[idx])}%</span>
                </div>
              );
            })}
            <p className="text-gray-600 text-[10px] mt-2 text-center">
              Rankings based on bodyweight-relative strength (e1RM ÷ BW)
            </p>
          </div>
        )}
      </div>

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

  // Group logs by month and exercise, compute best e1rm per period
  const byMonth = {};
  for (const log of logs) {
    if (!displayedLifts.includes(log.exercise_name)) continue;
    const d = new Date(log.logged_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = {};
    const e1rm = calcE1RM(log.weight_kg, log.reps);
    const displayed = kgToDisplay(e1rm, unit);
    if (!byMonth[key][log.exercise_name] || displayed > byMonth[key][log.exercise_name]) {
      byMonth[key][log.exercise_name] = displayed;
    }
  }

  const data = Object.keys(byMonth).sort().map(month => ({
    month: month.slice(5) + '/' + month.slice(2, 4),
    ...byMonth[month],
  }));

  if (data.length < 2) return <p className="text-gray-500 text-xs text-center py-4">Need more data for comparison</p>;

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
                ? 'text-dark-900 scale-105'
                : 'bg-dark-700 text-gray-400 border border-dark-500'
            }`}
            style={selectedLifts.includes(ex) ? { backgroundColor: COLORS[ex] } : undefined}
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
