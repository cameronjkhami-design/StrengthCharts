import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium, PREMIUM_FEATURES } from '../context/PremiumContext';
import { api } from '../utils/api';
import { calcE1RM, getTier, getPercentile, TIER_THRESHOLDS, TIER_ORDER, TIER_COLORS } from '../utils/benchmarks';
import { kgToDisplay, formatWeight, formatDate } from '../utils/conversions';
import TierBadge from '../components/TierBadge';
import ProgressBar from '../components/ProgressBar';
import PremiumGate, { ProTag } from '../components/PremiumGate';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { getPrimaryColor } from '../utils/colors';

export default function Overview() {
  const { user } = useAuth();
  const { hasAccess } = usePremium();
  const unit = user?.unit_pref || 'lbs';

  const [allLogs, setAllLogs] = useState([]);
  const [bodyweight, setBodyweight] = useState(null);
  const [bwLogs, setBwLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const hasPro = hasAccess(PREMIUM_FEATURES.OVERLAY_CHARTS);

  useEffect(() => {
    if (!hasPro) { setLoading(false); return; }
    Promise.all([
      api.getLifts(user.id),
      api.getLatestBodyweight(user.id),
      api.getBodyweight(user.id),
    ])
      .then(([logsData, bwData, bwHistData]) => {
        setAllLogs(logsData.logs);
        setBodyweight(bwData.log);
        setBwLogs(bwHistData.logs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id, hasPro]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!hasPro) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-display font-extrabold text-3xl text-white mb-4 flex items-center gap-3">
          OVERVIEW <ProTag />
        </h1>
        <PremiumGate featureId={PREMIUM_FEATURES.OVERLAY_CHARTS}>
          <div />
        </PremiumGate>
      </div>
    );
  }

  const bwKg = bodyweight?.weight_kg;

  // Compute e1RM and tier per exercise
  const e1rmMap = {};
  const logsByExercise = {};
  for (const log of allLogs) {
    const e1rm = calcE1RM(log.weight_kg, log.reps);
    if (!e1rmMap[log.exercise_name] || e1rm > e1rmMap[log.exercise_name]) {
      e1rmMap[log.exercise_name] = e1rm;
    }
    if (!logsByExercise[log.exercise_name]) logsByExercise[log.exercise_name] = [];
    logsByExercise[log.exercise_name].push(log);
  }

  const exerciseData = Object.entries(e1rmMap).map(([name, e1rm]) => {
    const ratio = bwKg ? e1rm / bwKg : 0;
    const tierInfo = getTier(name, ratio);
    const percentile = bwKg && TIER_THRESHOLDS[name] ? getPercentile(name, ratio) : null;
    return { name, e1rm, ratio, tierInfo, percentile };
  }).sort((a, b) => b.e1rm - a.e1rm);

  // Overall percentile
  const rankedExercises = exerciseData.filter(e => e.percentile !== null);
  const overallPercentile = rankedExercises.length > 0
    ? Math.round(rankedExercises.reduce((sum, e) => sum + e.percentile, 0) / rankedExercises.length)
    : null;

  // Total volume over time (weekly)
  const weeklyVolume = {};
  for (const log of allLogs) {
    const d = new Date(log.logged_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    if (!weeklyVolume[key]) weeklyVolume[key] = 0;
    weeklyVolume[key] += log.weight_kg * log.reps;
  }
  const volumeData = Object.entries(weeklyVolume)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // last 12 weeks
    .map(([week, vol]) => ({
      week: week.slice(5), // MM-DD
      volume: Math.round(kgToDisplay(vol, unit)),
    }));

  // Lift frequency
  const totalLifts = allLogs.length;
  const exerciseCount = Object.keys(logsByExercise).length;

  // Most recent lifts
  const recentLogs = allLogs.slice(0, 5);

  // Strength radar data (bar chart representation)
  const strengthBars = exerciseData
    .filter(e => TIER_THRESHOLDS[e.name])
    .slice(0, 6)
    .map(e => ({
      name: e.name.length > 10 ? e.name.slice(0, 10) + '…' : e.name,
      fullName: e.name,
      value: e.percentile || 0,
      color: e.tierInfo.color,
    }));

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      <h1 className="font-display font-extrabold text-3xl text-white mb-5 flex items-center gap-3">
        OVERVIEW <ProTag />
      </h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card text-center py-3">
          <p className="font-display font-extrabold text-xl text-primary">{totalLifts}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Total Lifts</p>
        </div>
        <div className="card text-center py-3">
          <p className="font-display font-extrabold text-xl text-white">{exerciseCount}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Exercises</p>
        </div>
        <div className="card text-center py-3">
          <p className="font-display font-extrabold text-xl text-white">
            {overallPercentile ? `Top ${100 - overallPercentile}%` : '—'}
          </p>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Percentile</p>
        </div>
      </div>

      {/* Strength Profile (Bar Chart) */}
      {strengthBars.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
            Strength Profile
          </h3>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strengthBars} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: '#d1d5db', fontSize: 10, fontWeight: 700 }} axisLine={{ stroke: '#3a3a3a' }} tickLine={false} interval={0} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }}
                  formatter={(value, name, props) => [`${value}th percentile`, props.payload.fullName]}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} activeBar={{ stroke: '#fff', strokeWidth: 2 }}>
                  {strengthBars.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weekly Volume Trend */}
      {volumeData.length >= 2 && (
        <div className="card mb-4">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
            Weekly Volume ({unit})
          </h3>
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={{ stroke: '#3a3a3a' }} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="volume" stroke={getPrimaryColor()} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* All Exercise Rankings */}
      <div className="card mb-4">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
          Exercise Rankings
        </h3>
        <div className="space-y-3">
          {exerciseData.map(({ name, e1rm, ratio, tierInfo, percentile }) => (
            <div key={name} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-display font-bold text-sm uppercase text-white truncate">{name}</p>
                  <TierBadge tier={tierInfo.tier} size="sm" />
                </div>
                {tierInfo.nextTier && (
                  <ProgressBar
                    progress={tierInfo.progress}
                    color={tierInfo.color}
                    sublabel={`${tierInfo.progress}% to ${tierInfo.nextTier}`}
                  />
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-display font-extrabold text-lg text-primary">
                  {kgToDisplay(e1rm, unit)}
                  <span className="text-[10px] text-gray-400 ml-1">{unit}</span>
                </p>
                {percentile && (
                  <p className="text-gray-500 text-[10px]">Top {100 - percentile}%</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benchmark Legend */}
      <div className="card mb-4">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
          Strength Rankings Legend
        </h3>
        <div className="space-y-2">
          {TIER_ORDER.map((tier, idx) => {
            const color = TIER_COLORS[tier];
            const descriptions = [
              'Little to no training experience',
              'Several months of training',
              '1-2 years consistent training',
              '3-5 years serious training',
              '5+ years competitive level',
              'Competition podium level',
            ];
            return (
              <div key={tier} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-white text-sm font-display font-semibold uppercase w-28 flex-shrink-0">{tier}</span>
                <span className="text-gray-500 text-xs truncate">{descriptions[idx]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
            Recent Activity
          </h3>
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div key={log.id} className="flex justify-between items-center py-2 border-b border-dark-600 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-display font-semibold uppercase truncate">{log.exercise_name}</p>
                  <p className="text-gray-500 text-xs">
                    {formatWeight(log.weight_kg, unit)} x {log.reps}
                    {log.rpe && <span className="ml-1">RPE {log.rpe}</span>}
                  </p>
                </div>
                <span className="text-gray-500 text-xs flex-shrink-0 ml-2">{formatDate(log.logged_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
