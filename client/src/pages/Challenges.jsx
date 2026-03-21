import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../utils/api';
import { calcE1RM, getTier, TIER_THRESHOLDS } from '../utils/benchmarks';
import { formatWeight, kgToDisplay } from '../utils/conversions';
import { getPrimaryColor } from '../utils/colors';

// Challenge templates that get personalized based on user data
const DAILY_TEMPLATES = [
  { id: 'd_log', type: 'daily', title: 'Log a Lift', description: 'Record at least 1 lift today', icon: 'log', check: (stats) => stats.liftsToday >= 1 },
  { id: 'd_volume', type: 'daily', title: 'Volume Pusher', description: 'Log 3+ sets today', icon: 'volume', check: (stats) => stats.liftsToday >= 3 },
  { id: 'd_heavy', type: 'daily', title: 'Go Heavy', description: 'Log a set of 3 reps or fewer', icon: 'heavy', check: (stats) => stats.heavyToday },
  { id: 'd_variety', type: 'daily', title: 'Mix It Up', description: 'Log 2+ different exercises today', icon: 'variety', check: (stats) => stats.exercisesToday >= 2 },
  { id: 'd_rpe', type: 'daily', title: 'Rate It', description: 'Log a lift with RPE today', icon: 'rpe', check: (stats) => stats.rpeLoggedToday },
];

const WEEKLY_TEMPLATES = [
  { id: 'w_consistent', type: 'weekly', title: 'Consistency King', description: 'Log lifts on 4+ different days this week', icon: 'calendar', check: (stats) => stats.daysThisWeek >= 4 },
  { id: 'w_volume', type: 'weekly', title: 'Volume Week', description: 'Log 15+ total sets this week', icon: 'volume', check: (stats) => stats.liftsThisWeek >= 15 },
  { id: 'w_exercises', type: 'weekly', title: 'Well Rounded', description: 'Train 4+ different exercises this week', icon: 'variety', check: (stats) => stats.exercisesThisWeek >= 4 },
  { id: 'w_pr', type: 'weekly', title: 'PR Chaser', description: 'Set a new personal record this week', icon: 'trophy', check: (stats) => stats.prThisWeek },
  { id: 'w_compound', type: 'weekly', title: 'Compound Focus', description: 'Log Squat, Bench, and Deadlift this week', icon: 'heavy', check: (stats) => stats.bigThreeThisWeek },
];

const MONTHLY_TEMPLATES = [
  { id: 'm_total', type: 'monthly', title: 'Iron Warrior', description: 'Log 50+ total sets this month', icon: 'volume', check: (stats) => stats.liftsThisMonth >= 50, progress: (stats) => Math.min(100, (stats.liftsThisMonth / 50) * 100) },
  { id: 'm_days', type: 'monthly', title: 'Monthly Grinder', description: 'Train on 16+ days this month', icon: 'calendar', check: (stats) => stats.daysThisMonth >= 16, progress: (stats) => Math.min(100, (stats.daysThisMonth / 16) * 100) },
  { id: 'm_exercises', type: 'monthly', title: 'Full Arsenal', description: 'Train 6+ different exercises this month', icon: 'variety', check: (stats) => stats.exercisesThisMonth >= 6, progress: (stats) => Math.min(100, (stats.exercisesThisMonth / 6) * 100) },
  { id: 'm_volume_tons', type: 'monthly', title: 'Tonnage Titan', description: 'Lift 10,000+ lbs total volume this month', icon: 'heavy', check: (stats) => stats.volumeThisMonth >= 10000, progress: (stats) => Math.min(100, (stats.volumeThisMonth / 10000) * 100) },
  { id: 'm_streak', type: 'monthly', title: 'Never Skip', description: 'No more than 2 consecutive rest days', icon: 'streak', check: (stats) => stats.maxRestStreak <= 2 },
];

// Friend challenges
const FRIEND_TEMPLATES = [
  { id: 'f_volume', type: 'friend', title: 'Volume War', description: 'Out-volume your top friend this week', icon: 'battle', check: (stats) => stats.aheadInVolume },
  { id: 'f_consistency', type: 'friend', title: 'Show Up More', description: 'Train more days than any friend this week', icon: 'calendar', check: (stats) => stats.aheadInDays },
  { id: 'f_add', type: 'friend', title: 'Squad Up', description: 'Have 3+ friends on StrengthCharts', icon: 'social', check: (stats) => stats.friendCount >= 3 },
];

function getChallengeIcon(icon) {
  const icons = {
    log: 'M12 5v14M5 12h14',
    volume: 'M6.5 6.5h11M6.5 17.5h11M4 6.5V17.5M20 6.5V17.5M2 9v6M22 9v6',
    heavy: 'M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.5l-4.8 2.4.9-5.4L4.2 7.7l5.4-.8z',
    variety: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    rpe: 'M22 12h-4l-3 9L9 3l-3 9H2',
    calendar: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
    trophy: 'M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 1012 0V2z',
    battle: 'M14.5 2L6 14h8L13.5 22 22 10h-8z',
    social: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    streak: 'M13 2L3 14h9l-1 8 10-12h-9l1-8',
  };
  return icons[icon] || icons.log;
}

function computeChallengeStats(allLogs, friends, unit) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const todayLogs = allLogs.filter(l => l.logged_at?.startsWith(todayStr));
  const weekLogs = allLogs.filter(l => l.logged_at >= weekStartStr);
  const monthLogs = allLogs.filter(l => l.logged_at >= monthStartStr);

  // Check for PRs this week
  const e1rmByExercise = {};
  const weekE1rms = {};
  for (const log of allLogs) {
    const e1rm = calcE1RM(log.weight_kg, log.reps);
    if (!e1rmByExercise[log.exercise_name] || e1rm > e1rmByExercise[log.exercise_name]) {
      e1rmByExercise[log.exercise_name] = e1rm;
    }
  }
  for (const log of weekLogs) {
    const e1rm = calcE1RM(log.weight_kg, log.reps);
    if (!weekE1rms[log.exercise_name] || e1rm > weekE1rms[log.exercise_name]) {
      weekE1rms[log.exercise_name] = e1rm;
    }
  }
  const prThisWeek = Object.entries(weekE1rms).some(
    ([exercise, e1rm]) => e1rm >= (e1rmByExercise[exercise] || 0)
  );

  // Big three check
  const weekExercises = new Set(weekLogs.map(l => l.exercise_name));
  const bigThreeThisWeek = ['Squat', 'Bench Press', 'Deadlift'].every(e => weekExercises.has(e));

  // Monthly volume
  const volumeThisMonthKg = monthLogs.reduce((sum, l) => sum + l.weight_kg * l.reps, 0);
  const volumeThisMonth = unit === 'lbs' ? Math.round(volumeThisMonthKg * 2.20462) : Math.round(volumeThisMonthKg);

  // Max consecutive rest days this month
  const monthDaysSet = new Set(monthLogs.map(l => l.logged_at?.split('T')[0]));
  let maxRestStreak = 0;
  let currentStreak = 0;
  for (let d = new Date(monthStart); d <= now; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split('T')[0];
    if (monthDaysSet.has(ds)) {
      currentStreak = 0;
    } else {
      currentStreak++;
      maxRestStreak = Math.max(maxRestStreak, currentStreak);
    }
  }

  return {
    liftsToday: todayLogs.length,
    exercisesToday: new Set(todayLogs.map(l => l.exercise_name)).size,
    heavyToday: todayLogs.some(l => l.reps <= 3),
    rpeLoggedToday: todayLogs.some(l => l.rpe),

    liftsThisWeek: weekLogs.length,
    daysThisWeek: new Set(weekLogs.map(l => l.logged_at?.split('T')[0])).size,
    exercisesThisWeek: weekExercises.size,
    prThisWeek,
    bigThreeThisWeek,

    liftsThisMonth: monthLogs.length,
    daysThisMonth: monthDaysSet.size,
    exercisesThisMonth: new Set(monthLogs.map(l => l.exercise_name)).size,
    volumeThisMonth,
    maxRestStreak,

    friendCount: friends.length,
    aheadInVolume: false, // Would need friend data
    aheadInDays: false,
  };
}

export default function Challenges() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const unit = user?.unit_pref || 'lbs';

  const [allLogs, setAllLogs] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');

  // Track completed challenges (persisted in localStorage)
  const [completedChallenges, setCompletedChallenges] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sc_challenges_completed')) || {}; } catch { return {}; }
  });

  useEffect(() => {
    Promise.all([
      api.getLifts(user.id),
      api.getFriends(user.id),
    ])
      .then(([logsData, friendsData]) => {
        setAllLogs(logsData.logs);
        setFriends(friendsData.friends);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  const stats = computeChallengeStats(allLogs, friends, unit);

  const tabs = [
    { key: 'daily', label: 'Daily', templates: DAILY_TEMPLATES },
    { key: 'weekly', label: 'Weekly', templates: WEEKLY_TEMPLATES },
    { key: 'monthly', label: 'Monthly', templates: MONTHLY_TEMPLATES },
    { key: 'friend', label: 'Friends', templates: FRIEND_TEMPLATES },
  ];

  const currentTemplates = tabs.find(t => t.key === activeTab)?.templates || [];

  // Date key for reset tracking
  const now = new Date();
  const dailyKey = now.toISOString().split('T')[0];
  const weekKey = (() => { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; })();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const getPeriodKey = (type) => {
    if (type === 'daily') return dailyKey;
    if (type === 'weekly') return weekKey;
    if (type === 'monthly') return monthKey;
    return monthKey;
  };

  const isChallengeComplete = (challenge) => {
    const periodKey = getPeriodKey(challenge.type);
    const storageKey = `${challenge.id}_${periodKey}`;
    return completedChallenges[storageKey] || challenge.check(stats);
  };

  const markComplete = (challenge) => {
    const periodKey = getPeriodKey(challenge.type);
    const storageKey = `${challenge.id}_${periodKey}`;
    const updated = { ...completedChallenges, [storageKey]: true };
    setCompletedChallenges(updated);
    localStorage.setItem('sc_challenges_completed', JSON.stringify(updated));
    addNotification('Challenge completed!', 'success');
  };

  const completedCount = currentTemplates.filter(c => isChallengeComplete(c)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="text-primary text-sm font-display font-bold uppercase mb-4 flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <h1 className="font-display font-extrabold text-3xl text-white mb-2">Challenges</h1>
      <p className="text-gray-500 text-xs mb-5">Complete challenges to push your training</p>

      {/* Progress Ring */}
      <div className="card mb-5">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#2a2a2a"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={getPrimaryColor()}
                strokeWidth="3"
                strokeDasharray={`${(completedCount / currentTemplates.length) * 100}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display font-extrabold text-lg text-white">{completedCount}/{currentTemplates.length}</span>
            </div>
          </div>
          <div>
            <p className="font-display font-bold text-white uppercase">
              {activeTab === 'daily' ? "Today's" : activeTab === 'weekly' ? "This Week's" : activeTab === 'monthly' ? "This Month's" : 'Friend'} Challenges
            </p>
            <p className="text-gray-500 text-xs">
              {completedCount === currentTemplates.length
                ? 'All challenges complete!'
                : `${currentTemplates.length - completedCount} remaining`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-dark-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-display font-bold uppercase transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-dark-900'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Challenge Cards */}
      <div className="space-y-3">
        {currentTemplates.map(challenge => {
          const complete = isChallengeComplete(challenge);
          const progress = challenge.progress ? challenge.progress(stats) : (complete ? 100 : 0);
          const iconPath = getChallengeIcon(challenge.icon);
          const isStroke = !['heavy', 'trophy'].includes(challenge.icon);

          return (
            <div
              key={challenge.id}
              className={`card transition-all ${complete ? 'border border-green-500/30 bg-green-500/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  complete ? 'bg-green-500/20' : 'bg-dark-700'
                }`}>
                  {complete ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-gray-400"
                      fill={isStroke ? 'none' : 'currentColor'}
                      stroke={isStroke ? 'currentColor' : 'none'}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={iconPath} />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-display font-bold text-sm uppercase ${complete ? 'text-green-400' : 'text-white'}`}>
                    {challenge.title}
                  </p>
                  <p className="text-gray-500 text-[10px]">{challenge.description}</p>
                  {challenge.progress && !complete && (
                    <div className="mt-1.5 w-full h-1.5 bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, backgroundColor: getPrimaryColor() }}
                      />
                    </div>
                  )}
                </div>

                {complete && (
                  <span className="text-green-400 text-[10px] font-display font-bold uppercase flex-shrink-0">Done</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="card mt-5">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">Your Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-700 rounded-xl p-3 text-center">
            <p className="font-display font-extrabold text-xl text-primary">{stats.liftsToday}</p>
            <p className="text-gray-500 text-[10px] uppercase">Sets Today</p>
          </div>
          <div className="bg-dark-700 rounded-xl p-3 text-center">
            <p className="font-display font-extrabold text-xl text-white">{stats.daysThisWeek}</p>
            <p className="text-gray-500 text-[10px] uppercase">Days This Week</p>
          </div>
          <div className="bg-dark-700 rounded-xl p-3 text-center">
            <p className="font-display font-extrabold text-xl text-white">{stats.liftsThisMonth}</p>
            <p className="text-gray-500 text-[10px] uppercase">Sets This Month</p>
          </div>
          <div className="bg-dark-700 rounded-xl p-3 text-center">
            <p className="font-display font-extrabold text-xl text-white">{stats.volumeThisMonth.toLocaleString()}</p>
            <p className="text-gray-500 text-[10px] uppercase">Volume ({unit})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
