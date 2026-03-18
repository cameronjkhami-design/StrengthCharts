import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePremium, PREMIUM_FEATURES } from '../context/PremiumContext';
import { api } from '../utils/api';
import { getTier, calcE1RM, MAIN_LIFTS } from '../utils/benchmarks';
import { formatWeight, kgToDisplay, formatDateShort } from '../utils/conversions';
import TierBadge from '../components/TierBadge';
import ProgressBar from '../components/ProgressBar';
import PremiumGate from '../components/PremiumGate';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [prs, setPrs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [bodyweight, setBodyweight] = useState(null);
  const [loading, setLoading] = useState(true);

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

    return { liftName, pr, e1rm, ratio, tierInfo };
  }).filter(c => c.pr);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
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
        + Log New PR
      </Link>

      {/* No data state */}
      {liftCards.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-gray-400 mb-2">No lifts logged yet</p>
          <p className="text-gray-600 text-sm">Tap "Log New PR" to get started</p>
        </div>
      )}

      {/* Exercise Comparison Chart (Premium) */}
      {liftCards.length >= 2 && (
        <PremiumGate featureId={PREMIUM_FEATURES.OVERLAY_CHARTS} blurContent>
          <div className="card mb-6">
            <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-2">
              Exercise Comparison
            </h3>
            <OverlayChart logs={allLogs} unit={unit} />
          </div>
        </PremiumGate>
      )}

      {/* Lift Summary Cards */}
      <div className="space-y-3">
        {liftCards.map(({ liftName, pr, e1rm, ratio, tierInfo }) => (
          <div key={liftName} className="card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-display font-bold text-lg uppercase text-white">{liftName}</h3>
                <p className="text-gray-500 text-xs">
                  Best: {formatWeight(pr.weight_kg, unit)} x {pr.reps}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-extrabold text-2xl text-primary">
                  {kgToDisplay(e1rm, unit)}
                  <span className="text-sm text-gray-400 ml-1">{unit}</span>
                </p>
                <p className="text-gray-500 text-[10px] uppercase">Est. 1RM</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <TierBadge tier={tierInfo.tier} size="sm" />
              {bwKg && (
                <span className="text-gray-500 text-xs">
                  {ratio.toFixed(2)}x BW
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

// Overlay chart component for exercise comparison
function OverlayChart({ logs, unit }) {
  const CHART_LIFTS = ['Squat', 'Bench Press', 'Deadlift'];
  const COLORS = { 'Squat': '#FFD700', 'Bench Press': '#3b82f6', 'Deadlift': '#ef4444' };

  // Group logs by date (monthly) and exercise, compute best e1rm per period
  const byMonth = {};
  for (const log of logs) {
    if (!CHART_LIFTS.includes(log.exercise_name)) continue;
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
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#3a3a3a' }} tickLine={false} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
          {CHART_LIFTS.map(lift => (
            <Line key={lift} type="monotone" dataKey={lift} stroke={COLORS[lift]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
