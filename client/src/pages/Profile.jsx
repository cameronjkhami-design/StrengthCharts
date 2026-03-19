import { useState, useEffect, useCallback } from 'react';
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
import { PRIMARY_COLOR } from '../utils/colors';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { isPremium, isNative } = usePremium();
  const { restorePurchases, restoring } = usePurchases();
  const { addNotification } = useNotification();
  const unit = user?.unit_pref || 'lbs';

  const [bwLogs, setBwLogs] = useState([]);
  const [newBW, setNewBW] = useState('');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Friends state
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Achievement state
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [allLifts, setAllLifts] = useState([]);

  // Showcase badge selection (persisted in localStorage)
  const [showcaseIds, setShowcaseIds] = useState(() => {
    const saved = localStorage.getItem('sc_showcase');
    return saved ? JSON.parse(saved) : [];
  });

  // Overall percentile
  const [overallPercentile, setOverallPercentile] = useState(null);

  // Sections toggle
  const [showFriends, setShowFriends] = useState(false);
  const [showBWHistory, setShowBWHistory] = useState(false);

  const loadFriends = useCallback(() => {
    api.getFriends(user.id)
      .then(data => setFriends(data.friends))
      .catch(console.error);
  }, [user.id]);

  const loadPending = useCallback(() => {
    api.getPendingRequests(user.id)
      .then(data => setPendingRequests(data.requests))
      .catch(console.error);
  }, [user.id]);

  useEffect(() => {
    Promise.all([
      api.getBodyweight(user.id).then(data => setBwLogs(data.logs)),
      api.getFriends(user.id).then(data => setFriends(data.friends)),
      api.getPendingRequests(user.id).then(data => setPendingRequests(data.requests)),
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
  }, [allLifts, bwLogs, friends, loading]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      api.searchUsers(user.id, searchQuery.trim())
        .then(data => setSearchResults(data.users))
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user.id]);

  const handleSendRequest = async (friendId) => {
    try {
      const targetUser = searchResults.find(u => u.id === friendId);
      const name = targetUser?.display_name || targetUser?.username || 'User';
      const result = await api.addFriend(user.id, friendId);
      if (result.status === 'accepted') {
        loadFriends();
        setSearchResults(prev => prev.map(u =>
          u.id === friendId ? { ...u, friend_status: 'accepted' } : u
        ));
        addNotification(`You and ${name} are now friends!`, 'friend');
      } else {
        setSearchResults(prev => prev.map(u =>
          u.id === friendId ? { ...u, friend_status: 'pending_sent' } : u
        ));
        addNotification(`Friend request sent to ${name}`, 'friend');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptRequest = async (friendId) => {
    try {
      const req = pendingRequests.find(r => r.id === friendId);
      const name = req?.display_name || req?.username || 'User';
      await api.acceptFriend(user.id, friendId);
      setPendingRequests(prev => prev.filter(r => r.id !== friendId));
      loadFriends();
      addNotification(`${name} added as friend!`, 'friend');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineRequest = async (friendId) => {
    try {
      await api.declineFriend(user.id, friendId);
      setPendingRequests(prev => prev.filter(r => r.id !== friendId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.removeFriend(user.id, friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
      setSearchResults(prev => prev.map(u =>
        u.id === friendId ? { ...u, friend_status: 'none' } : u
      ));
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleToggleUnit = async () => {
    const newUnit = unit === 'lbs' ? 'kg' : 'lbs';
    try {
      const data = await api.updateUser(user.id, { unit_pref: newUnit });
      updateUser(data.user);
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
    <div className="px-4 pt-6 pb-4">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-700 border border-dark-600 p-5 mb-5">
        {/* Decorative gradient orb */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="font-display font-extrabold text-xl text-dark-900">
                  {(user.display_name || user.username || '?')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="font-display font-extrabold text-2xl text-white">
                  {user.display_name || user.username}
                </h1>
                <p className="text-gray-500 text-xs">@{user.username}</p>
              </div>
            </div>
            {isPremium && (
              <span className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-xs font-display font-bold uppercase px-3 py-1.5 rounded-full tracking-wider border border-primary/20">
                PRO
              </span>
            )}
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
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider mr-1">Showcase</span>
              {showcasedBadges.length === 0 && (
                <span className="text-gray-600 text-[10px] italic">Tap badges below to showcase</span>
              )}
              {showcasedBadges.map(a => {
                const iconPath = BADGE_ICONS[a.category];
                const isStroke = a.category === 'strength' || a.category === 'social';
                return (
                  <div
                    key={a.id}
                    className="group relative flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 text-primary"
                      fill={isStroke ? 'none' : 'currentColor'}
                      stroke={isStroke ? 'currentColor' : 'none'}
                      strokeWidth={isStroke ? 2 : 0}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={iconPath} />
                    </svg>
                    <span className="text-primary text-[10px] font-display font-bold uppercase">{a.name}</span>
                  </div>
                );
              })}
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

      {/* Unit Toggle */}
      <div className="card mb-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Weight Unit</span>
          <button
            onClick={handleToggleUnit}
            className="bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 font-display font-bold text-sm"
          >
            {unit === 'lbs' ? 'LBS' : 'KG'}
            <span className="text-gray-500 ml-2">tap to switch</span>
          </button>
        </div>
      </div>

      {/* Pending Friend Requests */}
      {pendingRequests.length > 0 && (
        <div className="card mb-3 border-primary/30 bg-primary/5">
          <h3 className="font-display font-bold text-sm uppercase text-primary mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Friend Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-1">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between py-2 px-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white text-sm font-display font-semibold uppercase">
                    {req.display_name || req.username}
                  </p>
                  <p className="text-gray-500 text-xs">@{req.username}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req.id)}
                    className="bg-primary text-dark-900 text-xs font-display font-bold uppercase px-3 py-1.5 rounded-lg"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.id)}
                    className="text-gray-400 text-xs font-display font-bold uppercase px-3 py-1.5 border border-dark-500 rounded-lg"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends Section — Collapsible */}
      <div className="card mb-3">
        <button
          onClick={() => setShowFriends(!showFriends)}
          className="w-full flex justify-between items-center"
        >
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
            Friends ({friends.length})
          </h3>
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 text-gray-500 transition-transform ${showFriends ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showFriends && (
          <div className="mt-3">
            {/* Search */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            {/* Search Results */}
            {searchQuery.trim().length >= 2 && (
              <div className="mb-3 space-y-1">
                {searching && <p className="text-gray-500 text-xs text-center py-2">Searching...</p>}
                {!searching && searchResults.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-2">No users found</p>
                )}
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 px-3 bg-dark-700 rounded-lg">
                    <div>
                      <p className="text-white text-sm font-display font-semibold uppercase">
                        {u.display_name || u.username}
                      </p>
                      <p className="text-gray-500 text-xs">@{u.username}</p>
                    </div>
                    {u.friend_status === 'accepted' ? (
                      <button
                        onClick={() => handleRemoveFriend(u.id)}
                        className="text-red-400 text-xs font-display font-bold uppercase px-3 py-1.5 border border-red-400/30 rounded-lg"
                      >
                        Remove
                      </button>
                    ) : u.friend_status === 'pending_sent' ? (
                      <span className="text-gray-400 text-xs font-display font-bold uppercase px-3 py-1.5 border border-dark-500 rounded-lg">
                        Pending
                      </span>
                    ) : u.friend_status === 'pending_received' ? (
                      <button
                        onClick={() => handleAcceptRequest(u.id)}
                        className="bg-primary text-dark-900 text-xs font-display font-bold uppercase px-3 py-1.5 rounded-lg"
                      >
                        Accept
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(u.id)}
                        className="bg-primary text-dark-900 text-xs font-display font-bold uppercase px-3 py-1.5 rounded-lg"
                      >
                        Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Current Friends */}
            {friends.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between py-2 px-3 bg-dark-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center">
                        <span className="font-display font-bold text-xs text-gray-400">
                          {(friend.display_name || friend.username || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-display font-semibold uppercase">
                          {friend.display_name || friend.username}
                        </p>
                        <p className="text-gray-500 text-xs">@{friend.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="text-red-400 text-xs font-display font-bold uppercase px-3 py-1.5 border border-red-400/30 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-xs text-center py-2">
                No friends yet. Search above to add some!
              </p>
            )}
          </div>
        )}
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
                  stroke={PRIMARY_COLOR}
                  strokeWidth={2}
                  dot={{ fill: PRIMARY_COLOR, r: 3 }}
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
