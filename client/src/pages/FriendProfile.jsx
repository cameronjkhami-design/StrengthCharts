import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { calcE1RM, getTier, getPercentile, TIER_THRESHOLDS, MAIN_LIFTS } from '../utils/benchmarks';
import { formatWeight, kgToDisplay, formatDateShort } from '../utils/conversions';
import { ACHIEVEMENTS, BADGE_ICONS, RARITY_COLORS } from '../utils/achievements';
import TierBadge from '../components/TierBadge';
import ProgressBar from '../components/ProgressBar';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getPrimaryColor } from '../utils/colors';

export default function FriendProfile() {
  const { friendId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const unit = user?.unit_pref || 'lbs';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    api.getFriendProfile(user.id, friendId)
      .then(data => {
        setProfile(data.profile);
        // Auto-select first exercise with data for chart
        if (data.profile.lifts?.length > 0) {
          const exercises = [...new Set(data.profile.lifts.map(l => l.exercise_name))];
          setSelectedExercise(exercises[0]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.id, friendId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-6 pb-4 overflow-x-hidden">
        <button onClick={() => navigate('/friends')} className="text-primary text-sm font-display font-bold uppercase mb-4 flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <div className="card text-center py-10">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const { privacy } = profile;
  const bwKg = profile.bodyweight?.[0]?.weight_kg;

  // Build PR cards
  const liftCards = privacy.showPrs && profile.prs ? MAIN_LIFTS.map(liftName => {
    const pr = profile.prs.find(p => p.exercise_name === liftName);
    if (!pr) return null;
    const e1rm = calcE1RM(pr.weight_kg, pr.reps);
    const ratio = bwKg ? e1rm / bwKg : 0;
    const tierInfo = getTier(liftName, ratio);
    const percentile = bwKg ? getPercentile(liftName, ratio) : null;
    return { liftName, pr, e1rm, ratio, tierInfo, percentile };
  }).filter(Boolean) : [];

  // Overall percentile
  let overallPercentile = null;
  if (privacy.showPrs && profile.prs && bwKg) {
    const percentiles = [];
    for (const pr of profile.prs) {
      if (TIER_THRESHOLDS[pr.exercise_name]) {
        const e1rm = calcE1RM(pr.weight_kg, pr.reps);
        const ratio = e1rm / bwKg;
        percentiles.push(getPercentile(pr.exercise_name, ratio));
      }
    }
    if (percentiles.length > 0) {
      overallPercentile = Math.round(percentiles.reduce((a, b) => a + b, 0) / percentiles.length);
    }
  }

  // Exercise list for chart selector
  const exerciseNames = privacy.showLifts && profile.lifts
    ? [...new Set(profile.lifts.map(l => l.exercise_name))]
    : [];

  // Chart data for selected exercise
  const chartData = privacy.showLifts && selectedExercise && profile.lifts
    ? [...profile.lifts]
        .filter(l => l.exercise_name === selectedExercise)
        .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
        .map(log => ({
          date: formatDateShort(log.logged_at),
          weight: kgToDisplay(log.weight_kg, unit),
          e1rm: kgToDisplay(calcE1RM(log.weight_kg, log.reps), unit),
        }))
    : [];

  // BW chart data
  const bwChartData = privacy.showBodyweight && profile.bodyweight
    ? [...profile.bodyweight]
        .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
        .map(log => ({
          date: formatDateShort(log.logged_at),
          weight: kgToDisplay(log.weight_kg, unit),
        }))
    : [];

  const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-xs">
        <p className="text-white font-semibold">{payload[0].payload.date}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value} {unit}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      {/* Back button */}
      <button onClick={() => navigate('/friends')} className="text-primary text-sm font-display font-bold uppercase mb-4 flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6" /></svg>
        Friends
      </button>

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-700 border border-dark-600 p-5 mb-5" style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl" style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', WebkitTransform: 'translate3d(0,0,0)', transform: 'translate3d(0,0,0)' }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', WebkitTransform: 'translate3d(0,0,0)', transform: 'translate3d(0,0,0)' }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            {profile.profile_photo ? (
              <img src={profile.profile_photo} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="font-display font-extrabold text-xl text-dark-900">
                  {(profile.display_name || profile.username || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-display font-extrabold text-2xl text-white">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-gray-500 text-xs">@{profile.username}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-dark-900/50 rounded-xl p-3 text-center">
              <p className="font-display font-extrabold text-xl text-white">
                {overallPercentile ? `Top ${100 - overallPercentile}%` : '—'}
              </p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Percentile</p>
            </div>
            <div className="bg-dark-900/50 rounded-xl p-3 text-center">
              <p className="font-display font-extrabold text-xl text-primary">
                {privacy.showPrs ? (profile.prs?.length || 0) : '—'}
              </p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Exercises</p>
            </div>
            <div className="bg-dark-900/50 rounded-xl p-3 text-center">
              <p className="font-display font-extrabold text-xl text-white">{profile.friendCount}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Friends</p>
            </div>
          </div>

          {/* Bodyweight display */}
          {privacy.showBodyweight && bwKg && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Bodyweight</span>
              <span className="text-white font-display font-bold text-sm">{formatWeight(bwKg, unit)}</span>
            </div>
          )}

          {/* Showcased Badges */}
          {profile.showcase_badges?.length > 0 && (() => {
            const showcased = profile.showcase_badges
              .map(id => ACHIEVEMENTS.find(a => a.id === id))
              .filter(Boolean);
            if (showcased.length === 0) return null;
            return (
              <div className="mt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-gray-500 text-[10px] uppercase tracking-wider">Showcase</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {showcased.map(a => {
                    const iconPath = BADGE_ICONS[a.category];
                    const isStroke = a.category === 'strength' || a.category === 'social' || a.category === 'consistency';
                    const rarityStr = typeof a.rarity === 'function' ? 'common' : a.rarity;
                    const rarity = RARITY_COLORS[rarityStr] || RARITY_COLORS.common;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 min-w-0"
                        style={{ backgroundColor: rarity.glow, border: `1px solid ${rarity.border}40` }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: rarity.bg }}
                          fill={isStroke ? 'none' : 'currentColor'}
                          stroke={isStroke ? 'currentColor' : 'none'}
                          strokeWidth={isStroke ? 2 : 0}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d={iconPath} />
                        </svg>
                        <span className="text-[10px] font-display font-bold uppercase truncate" style={{ color: rarity.border }}>{a.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* PR Cards */}
      {privacy.showPrs && liftCards.length > 0 && (
        <div className="mb-5">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">Personal Records</h3>
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
      )}

      {privacy.showPrs && liftCards.length === 0 && (
        <div className="card text-center py-6 mb-5">
          <p className="text-gray-500 text-sm">No PRs logged yet</p>
        </div>
      )}

      {!privacy.showPrs && (
        <div className="card text-center py-6 mb-5">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <p className="text-gray-500 text-sm">PRs are private</p>
        </div>
      )}

      {/* Lift Progress Chart */}
      {privacy.showLifts && exerciseNames.length > 0 && (
        <div className="card mb-5">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">Lift Progress</h3>

          {/* Exercise selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            {exerciseNames.map(name => (
              <button
                key={name}
                onClick={() => setSelectedExercise(name)}
                className={`flex-shrink-0 text-xs font-display font-bold uppercase px-3 py-1.5 rounded-lg transition-colors ${
                  selectedExercise === name
                    ? 'bg-primary text-dark-900'
                    : 'bg-dark-600 text-gray-400 border border-dark-500'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {chartData.length >= 2 ? (
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#3a3a3a' }} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="e1rm" stroke={getPrimaryColor()} strokeWidth={2} dot={{ fill: getPrimaryColor(), r: 3 }} name="E1RM" />
                  <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={1.5} dot={{ fill: '#3b82f6', r: 2 }} name="Weight" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-xs text-center py-4">Not enough data for chart</p>
          )}
        </div>
      )}

      {!privacy.showLifts && (
        <div className="card text-center py-6 mb-5">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <p className="text-gray-500 text-sm">Lift history is private</p>
        </div>
      )}

      {/* Bodyweight Trend */}
      {privacy.showBodyweight && bwChartData.length >= 2 && (
        <div className="card mb-5">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">Bodyweight Over Time</h3>
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bwChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#3a3a3a' }} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="weight" stroke={getPrimaryColor()} strokeWidth={2} dot={{ fill: getPrimaryColor(), r: 3 }} name="Weight" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!privacy.showBodyweight && (
        <div className="card text-center py-6 mb-5">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <p className="text-gray-500 text-sm">Bodyweight is private</p>
        </div>
      )}
    </div>
  );
}
