import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePremium, PREMIUM_FEATURES } from '../context/PremiumContext';
import { ProTag } from '../components/PremiumGate';
import { useNotification } from '../context/NotificationContext';
import { api } from '../utils/api';
import { ACHIEVEMENTS, BADGE_ICONS, computeStats, getEarnedAchievements } from '../utils/achievements';
import { calcE1RM, getTier, getPercentile, TIER_THRESHOLDS } from '../utils/benchmarks';
import { formatWeight, inputToKg, kgToDisplay, formatDate } from '../utils/conversions';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ProUpgradeModal from '../components/ProUpgradeModal';
import { usePurchases } from '../hooks/usePurchases';
import { getPrimaryColor } from '../utils/colors';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { isPremium, isNative } = usePremium();
  const { restorePurchases, restoring } = usePurchases();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const unit = user?.unit_pref || 'lbs';

  const [bwLogs, setBwLogs] = useState([]);
  const [newBW, setNewBW] = useState('');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Friends state (count only, management moved to Friends tab)
  const [friends, setFriends] = useState([]);

  // Achievement state
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [allLifts, setAllLifts] = useState([]);

  // New PR badge — true if any PR was set in the last 7 days
  const [hasRecentPR, setHasRecentPR] = useState(false);

  // Profile photo (persisted in localStorage as base64)
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('sc_profile_photo') || null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addNotification('Photo must be under 2MB', 'info');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      localStorage.setItem('sc_profile_photo', base64);
      setProfilePhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  // Showcase badge selection (persisted in localStorage)
  const [showcaseIds, setShowcaseIds] = useState(() => {
    const saved = localStorage.getItem('sc_showcase');
    return saved ? JSON.parse(saved) : [];
  });

  // Overall percentile
  const [overallPercentile, setOverallPercentile] = useState(null);

  // Sections toggle
  const [showBWHistory, setShowBWHistory] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getBodyweight(user.id).then(data => setBwLogs(data.logs)),
      api.getFriends(user.id).then(data => setFriends(data.friends)),
      api.getLifts(user.id).then(data => setAllLifts(data.logs)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  // Compute achievements
  useEffect(() => {
    if (loading) return;
    const bwKg = bwLogs[0]?.weight_kg;
    const e1rmMap = {};
    for (const log of allLifts) {
      const e1rm = calcE1RM(log.weight_kg, log.reps);
      if (!e1rmMap[log.exercise_name] || e1rm > e1rmMap[log.exercise_name]) {
        e1rmMap[log.exercise_name] = e1rm;
      }
    }
    const tierMap = {};
    for (const [exercise, e1rm] of Object.entries(e1rmMap)) {
      const ratio = bwKg ? e1rm / bwKg : 0;
      const info = getTier(exercise, ratio);
      tierMap[exercise] = info.tier;
    }
    const stats = computeStats({
      lifts: allLifts,
      prs: [],
      bodyweightLogs: bwLogs,
      friends,
      tierMap,
      e1rmMap,
    });
    setEarnedAchievements(getEarnedAchievements(stats));

    // Compute overall percentile (average across ranked lifts)
    if (bwKg) {
      const percentiles = [];
      for (const [exercise, e1rm] of Object.entries(e1rmMap)) {
        if (TIER_THRESHOLDS[exercise]) {
          const ratio = e1rm / bwKg;
          percentiles.push(getPercentile(exercise, ratio));
        }
      }
      if (percentiles.length > 0) {
        setOverallPercentile(Math.round(percentiles.reduce((a, b) => a + b, 0) / percentiles.length));
      }
    }
    // Check for recent PRs (within last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const bestByExercise = {};
    for (const log of allLifts) {
      const e1rm = calcE1RM(log.weight_kg, log.reps);
      if (!bestByExercise[log.exercise_name] || e1rm > bestByExercise[log.exercise_name].e1rm) {
        bestByExercise[log.exercise_name] = { e1rm, logged_at: log.logged_at };
      }
    }
    setHasRecentPR(Object.values(bestByExercise).some(pr => new Date(pr.logged_at) >= oneWeekAgo));
  }, [allLifts, bwLogs, friends, loading]);

  const handleLogBW = async (e) => {
    e.preventDefault();
    const val = parseFloat(newBW);
    if (isNaN(val) || val <= 0) return;
    try {
      const data = await api.logBodyweight({
        user_id: user.id,
        weight_kg: inputToKg(val, unit),
      });
      setBwLogs([data.log, ...bwLogs]);
      setNewBW('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const data = await api.updateUser(user.id, { display_name: displayName.trim() });
      updateUser(data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Chart data
  const chartData = [...bwLogs]
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
    .map(log => ({
      date: formatDate(log.logged_at).replace(/, \d{4}$/, ''),
      weight: kgToDisplay(log.weight_kg, unit),
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-xs">
        <p className="text-white font-semibold">{payload[0].payload.date}</p>
        <p className="text-primary">{payload[0].value} {unit}</p>
      </div>
    );
  };

  // Showcase toggle handler
  const toggleShowcase = (achievementId) => {
    setShowcaseIds(prev => {
      let next;
      if (prev.includes(achievementId)) {
        next = prev.filter(id => id !== achievementId);
      } else if (prev.length >= 3) {
        // Replace oldest
        next = [...prev.slice(1), achievementId];
      } else {
        next = [...prev, achievementId];
      }
      localStorage.setItem('sc_showcase', JSON.stringify(next));
      return next;
    });
  };

  // Showcased badges from selected IDs (only earned ones)
  const showcasedBadges = showcaseIds
    .map(id => earnedAchievements.find(a => a.id === id))
    .filter(Boolean);

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-700 border border-dark-600 p-5 mb-5">
        {/* Decorative gradient orb */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar with photo support */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="profile-photo-input"
                />
                <label htmlFor="profile-photo-input" className="cursor-pointer block">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <span className="font-display font-extrabold text-xl text-dark-900">
                        {(user.display_name || user.username || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Camera icon overlay */}
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-dark-700 border border-dark-500 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </label>
                {hasRecentPR && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-dark-800">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 8 10 16 6 12" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-display font-extrabold text-2xl text-white">
                  {user.display_name || user.username}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-gray-500 text-xs">@{user.username}</p>
                  {hasRecentPR && (
                    <span className="text-green-400 text-[10px] font-display font-bold uppercase">New PR</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPremium && (
                <span className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-xs font-display font-bold uppercase px-3 py-1.5 rounded-full tracking-wider border border-primary/20">
                  PRO
                </span>
              )}
              <button
                onClick={() => navigate('/settings')}
                className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
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
              <p className="font-display font-extrabold text-xl text-primary">{earnedAchievements.length}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Badges</p>
            </div>
            <div className="bg-dark-900/50 rounded-xl p-3 text-center">
              <p className="font-display font-extrabold text-xl text-white">{friends.length}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Friends</p>
            </div>
          </div>

          {/* Showcased Badges */}
          {earnedAchievements.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Showcase</span>
                {showcasedBadges.length === 0 && (
                  <span className="text-gray-600 text-[10px] italic">Tap badges below to showcase</span>
                )}
              </div>
              {showcasedBadges.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {showcasedBadges.map(a => {
                    const iconPath = BADGE_ICONS[a.category];
                    const isStroke = a.category === 'strength' || a.category === 'social';
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 min-w-0"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-3.5 h-3.5 text-primary flex-shrink-0"
                          fill={isStroke ? 'none' : 'currentColor'}
                          stroke={isStroke ? 'currentColor' : 'none'}
                          strokeWidth={isStroke ? 2 : 0}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d={iconPath} />
                        </svg>
                        <span className="text-primary text-[10px] font-display font-bold uppercase truncate">{a.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Name */}
      <div className="card mb-3">
        <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">Display Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field flex-1"
          />
          <button onClick={handleSaveName} className="btn-secondary text-sm px-4" disabled={saving}>
            Save
          </button>
        </div>
      </div>

      {/* Log Bodyweight */}
      <div className="card mb-3">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
          Log Bodyweight
        </h3>
        <form onSubmit={handleLogBW} className="flex gap-2">
          <input
            type="number"
            placeholder={`Weight (${unit})`}
            value={newBW}
            onChange={(e) => setNewBW(e.target.value)}
            className="input-field flex-1 font-display text-xl text-center"
            inputMode="decimal"
            step="any"
          />
          <button type="submit" className="btn-primary px-6">Log</button>
        </form>
      </div>

      {/* BW Trendline */}
      {chartData.length > 1 && (
        <div className="card mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
              Bodyweight Over Time
              <ProTag />
            </h3>
          </div>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#3a3a3a' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={getPrimaryColor()}
                  strokeWidth={2}
                  dot={{ fill: getPrimaryColor(), r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* BW History — Collapsible */}
      {bwLogs.length > 0 && (
        <div className="card mb-3">
          <button
            onClick={() => setShowBWHistory(!showBWHistory)}
            className="w-full flex justify-between items-center"
          >
            <h3 className="font-display font-bold text-sm uppercase text-gray-400">
              Bodyweight History ({bwLogs.length})
            </h3>
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 text-gray-500 transition-transform ${showBWHistory ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showBWHistory && (
            <div className="space-y-2 max-h-48 overflow-y-auto mt-3">
              {bwLogs.map(log => (
                <div key={log.id} className="flex justify-between items-center py-1.5 border-b border-dark-600 last:border-0">
                  <span className="text-white font-display font-semibold">
                    {formatWeight(log.weight_kg, unit)}
                  </span>
                  <span className="text-gray-500 text-xs">{formatDate(log.logged_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Achievements */}
      <div className="card mb-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
            Achievements
            <ProTag />
          </h3>
          <span className="text-primary text-xs font-display font-bold">
            {earnedAchievements.length}/{ACHIEVEMENTS.length}
          </span>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {ACHIEVEMENTS.map(achievement => {
            const earned = earnedAchievements.some(a => a.id === achievement.id);
            const isShowcased = showcaseIds.includes(achievement.id);
            const iconPath = BADGE_ICONS[achievement.category];
            const isStroke = achievement.category === 'strength' || achievement.category === 'social';
            return (
              <div
                key={achievement.id}
                onClick={() => earned && toggleShowcase(achievement.id)}
                className={`relative flex flex-col items-center p-2.5 rounded-xl transition-all ${
                  earned ? 'cursor-pointer active:scale-95' : ''
                } ${
                  isShowcased
                    ? 'bg-gradient-to-b from-primary/25 to-primary/10 border-2 border-primary shadow-lg shadow-primary/10'
                    : earned
                    ? 'bg-gradient-to-b from-primary/15 to-primary/5 border border-primary/30 shadow-lg shadow-primary/5'
                    : 'bg-dark-700/50 border border-dark-600 opacity-30'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                  earned ? 'bg-primary/20' : 'bg-dark-600'
                }`}>
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-4 h-4 ${earned ? 'text-primary' : 'text-gray-600'}`}
                    fill={isStroke ? 'none' : 'currentColor'}
                    stroke={isStroke ? 'currentColor' : 'none'}
                    strokeWidth={isStroke ? 2 : 0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={iconPath} />
                  </svg>
                </div>
                <span className={`text-[8px] font-display font-bold uppercase text-center leading-tight ${
                  earned ? 'text-white' : 'text-gray-600'
                }`}>
                  {achievement.name}
                </span>
                {earned && (
                  <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                    isShowcased ? 'bg-primary' : 'bg-primary/70'
                  }`}>
                    {isShowcased ? (
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-dark-900" fill="currentColor">
                        <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.5l-4.8 2.4.9-5.4L4.2 7.7l5.4-.8z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-2 h-2 text-dark-900" fill="none" stroke="currentColor" strokeWidth={4}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Earned List */}
        {earnedAchievements.length > 0 && (
          <div className="space-y-1.5">
            {earnedAchievements.map(a => {
              const isStroke = a.category === 'strength' || a.category === 'social';
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 px-3 bg-dark-700/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4 text-primary"
                      fill={isStroke ? 'none' : 'currentColor'}
                      stroke={isStroke ? 'currentColor' : 'none'}
                      strokeWidth={isStroke ? 2 : 0}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={BADGE_ICONS[a.category]} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-display font-bold uppercase truncate">{a.name}</p>
                    <p className="text-gray-500 text-[10px] truncate">{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pro Upgrade Card */}
      {!isPremium && isNative && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 mb-3">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
          <div className="relative flex justify-between items-center">
            <div>
              <p className="font-display font-bold text-white uppercase">Go Pro</p>
              <p className="text-gray-400 text-xs">$2.99/mo — unlock all features</p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-primary text-dark-900 font-display font-bold text-sm px-5 py-2.5 rounded-xl uppercase active:scale-95 transition-transform"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Restore Purchases (native only) */}
      {!isPremium && isNative && (
        <button
          onClick={restorePurchases}
          disabled={restoring}
          className="w-full text-center text-gray-500 text-xs py-3"
        >
          {restoring ? 'Restoring...' : 'Restore Purchases'}
        </button>
      )}

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full text-center text-red-400 text-sm py-4 font-semibold"
      >
        Log Out
      </button>

      <ProUpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}
