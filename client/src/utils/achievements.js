// Achievement definitions — Premium achievement system
// Each achievement has an id, name, description, category, and a check function
// Rarity can be static or a function of stats (for sex-dependent rarity)
// check(stats) returns true if the achievement is earned

// Helper: returns rarity based on sex. Female lifters get higher rarity for
// the same weight milestones because they are proportionally harder feats.
function plateRarity(maleRarity, femaleRarity) {
  return (s) => s.sex === 'female' ? femaleRarity : maleRarity;
}

export const ACHIEVEMENTS = [
  // ═══════════════════════════════════════
  // MILESTONE ACHIEVEMENTS (sex-neutral)
  // ═══════════════════════════════════════
  {
    id: 'first_lift',
    name: 'First Rep',
    description: 'Log your first lift',
    category: 'milestones',
    rarity: 'common',
    check: (s) => s.totalLifts >= 1,
  },
  {
    id: 'ten_lifts',
    name: 'Getting Started',
    description: 'Log 10 lifts',
    category: 'milestones',
    rarity: 'common',
    check: (s) => s.totalLifts >= 10,
  },
  {
    id: 'fifty_lifts',
    name: 'Dedicated',
    description: 'Log 50 lifts',
    category: 'milestones',
    rarity: 'uncommon',
    check: (s) => s.totalLifts >= 50,
  },
  {
    id: 'hundred_lifts',
    name: 'Iron Addict',
    description: 'Log 100 lifts',
    category: 'milestones',
    rarity: 'rare',
    check: (s) => s.totalLifts >= 100,
  },
  {
    id: 'two_fifty_lifts',
    name: 'Gym Rat',
    description: 'Log 250 lifts',
    category: 'milestones',
    rarity: 'epic',
    check: (s) => s.totalLifts >= 250,
  },
  {
    id: 'five_hundred_lifts',
    name: 'Living Legend',
    description: 'Log 500 lifts',
    category: 'milestones',
    rarity: 'legendary',
    check: (s) => s.totalLifts >= 500,
  },
  {
    id: 'track_bw',
    name: 'Weight Watcher',
    description: 'Log your bodyweight',
    category: 'milestones',
    rarity: 'common',
    check: (s) => s.bwLogCount >= 1,
  },
  {
    id: 'three_exercises',
    name: 'Triple Threat',
    description: 'Log 3 different exercises',
    category: 'milestones',
    rarity: 'common',
    check: (s) => s.exerciseCount >= 3,
  },
  {
    id: 'five_exercises',
    name: 'Variety Pack',
    description: 'Log 5 different exercises',
    category: 'milestones',
    rarity: 'uncommon',
    check: (s) => s.exerciseCount >= 5,
  },

  // ═══════════════════════════════════════
  // STRENGTH TIER ACHIEVEMENTS (sex-neutral — tiers already account for BW ratio)
  // ═══════════════════════════════════════
  {
    id: 'first_beginner',
    name: 'On Your Way',
    description: 'Reach Beginner tier on any lift',
    category: 'strength',
    rarity: 'common',
    check: (s) => s.tiers.some(t => ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'World Class'].includes(t)),
  },
  {
    id: 'first_intermediate',
    name: 'Solid Foundation',
    description: 'Reach Intermediate tier on any lift',
    category: 'strength',
    rarity: 'uncommon',
    check: (s) => s.tiers.some(t => ['Intermediate', 'Advanced', 'Elite', 'World Class'].includes(t)),
  },
  {
    id: 'first_advanced',
    name: 'Advanced Lifter',
    description: 'Reach Advanced tier on any lift',
    category: 'strength',
    rarity: 'rare',
    check: (s) => s.tiers.some(t => ['Advanced', 'Elite', 'World Class'].includes(t)),
  },
  {
    id: 'first_elite',
    name: 'Elite Status',
    description: 'Reach Elite tier on any lift',
    category: 'strength',
    rarity: 'epic',
    check: (s) => s.tiers.some(t => ['Elite', 'World Class'].includes(t)),
  },
  {
    id: 'world_class',
    name: 'World Class',
    description: 'Reach World Class tier on any lift',
    category: 'strength',
    rarity: 'legendary',
    check: (s) => s.tiers.some(t => t === 'World Class'),
  },
  {
    id: 'all_intermediate',
    name: 'Building Momentum',
    description: 'Reach Intermediate on Squat, Bench & Deadlift',
    category: 'strength',
    rarity: 'uncommon',
    check: (s) => {
      const main = ['Squat', 'Bench Press', 'Deadlift'];
      return main.every(lift => {
        const tier = s.tierMap[lift];
        return tier && ['Intermediate', 'Advanced', 'Elite', 'World Class'].includes(tier);
      });
    },
  },
  {
    id: 'all_advanced',
    name: 'Well Rounded',
    description: 'Reach Advanced on Squat, Bench & Deadlift',
    category: 'strength',
    rarity: 'epic',
    check: (s) => {
      const main = ['Squat', 'Bench Press', 'Deadlift'];
      return main.every(lift => {
        const tier = s.tierMap[lift];
        return tier && ['Advanced', 'Elite', 'World Class'].includes(tier);
      });
    },
  },

  // ═══════════════════════════════════════
  // PLATE CLUB ACHIEVEMENTS
  // Rarity is sex-dependent: same weight thresholds, but female lifters
  // get higher rarity because these are proportionally harder feats.
  //
  // Male rarity reflects typical male strength progression.
  // Female rarity is 1-2 tiers higher for the same weight.
  // ═══════════════════════════════════════
  {
    id: 'one_plate_bench',
    name: '1 Plate Bench',
    description: 'Bench Press 60kg / 135lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('common', 'rare'),           // M: common, F: rare
    check: (s) => (s.e1rmMap['Bench Press'] || 0) >= 60,
  },
  {
    id: 'one_plate_squat',
    name: '1 Plate Squat',
    description: 'Squat 60kg / 135lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('common', 'uncommon'),       // M: common, F: uncommon
    check: (s) => (s.e1rmMap['Squat'] || 0) >= 60,
  },
  {
    id: 'one_plate_deadlift',
    name: '1 Plate Deadlift',
    description: 'Deadlift 60kg / 135lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('common', 'common'),         // M: common, F: common
    check: (s) => (s.e1rmMap['Deadlift'] || 0) >= 60,
  },
  {
    id: 'one_plate_ohp',
    name: '1 Plate OHP',
    description: 'Overhead Press 60kg / 135lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('uncommon', 'legendary'),    // M: uncommon, F: legendary
    check: (s) => (s.e1rmMap['Overhead Press'] || 0) >= 60,
  },
  {
    id: 'two_plate_squat',
    name: '2 Plate Squat',
    description: 'Squat 100kg / 225lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('uncommon', 'epic'),         // M: uncommon, F: epic
    check: (s) => (s.e1rmMap['Squat'] || 0) >= 100,
  },
  {
    id: 'two_plate_bench',
    name: '2 Plate Bench',
    description: 'Bench Press 100kg / 225lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('rare', 'legendary'),        // M: rare, F: legendary
    check: (s) => (s.e1rmMap['Bench Press'] || 0) >= 100,
  },
  {
    id: 'two_plate_deadlift',
    name: '2 Plate Deadlift',
    description: 'Deadlift 100kg / 225lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('uncommon', 'rare'),         // M: uncommon, F: rare
    check: (s) => (s.e1rmMap['Deadlift'] || 0) >= 100,
  },
  {
    id: 'three_plate_squat',
    name: '3 Plate Squat',
    description: 'Squat 140kg / 315lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('rare', 'legendary'),        // M: rare, F: legendary
    check: (s) => (s.e1rmMap['Squat'] || 0) >= 140,
  },
  {
    id: 'three_plate_bench',
    name: '3 Plate Bench',
    description: 'Bench Press 140kg / 315lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('epic', 'legendary'),        // M: epic, F: legendary
    check: (s) => (s.e1rmMap['Bench Press'] || 0) >= 140,
  },
  {
    id: 'three_plate_deadlift',
    name: '3 Plate Deadlift',
    description: 'Deadlift 140kg / 315lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('uncommon', 'epic'),         // M: uncommon, F: epic
    check: (s) => (s.e1rmMap['Deadlift'] || 0) >= 140,
  },
  {
    id: 'four_plate_squat',
    name: '4 Plate Squat',
    description: 'Squat 180kg / 405lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('epic', 'legendary'),        // M: epic, F: legendary
    check: (s) => (s.e1rmMap['Squat'] || 0) >= 180,
  },
  {
    id: 'four_plate_deadlift',
    name: '4 Plate Deadlift',
    description: 'Deadlift 180kg / 405lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('rare', 'legendary'),        // M: rare, F: legendary
    check: (s) => (s.e1rmMap['Deadlift'] || 0) >= 180,
  },
  {
    id: 'five_plate_deadlift',
    name: '5 Plate Deadlift',
    description: 'Deadlift 220kg / 495lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('legendary', 'legendary'),   // M: legendary, F: legendary
    check: (s) => (s.e1rmMap['Deadlift'] || 0) >= 220,
  },
  {
    id: 'thousand_pound_club',
    name: '1000lb Club',
    description: 'SBD total over 453kg / 1000lbs (e1RM)',
    category: 'clubs',
    rarity: plateRarity('epic', 'legendary'),        // M: epic, F: legendary
    check: (s) => {
      const squat = s.e1rmMap['Squat'] || 0;
      const bench = s.e1rmMap['Bench Press'] || 0;
      const dead = s.e1rmMap['Deadlift'] || 0;
      return (squat + bench + dead) >= 453;
    },
  },

  // ═══════════════════════════════════════
  // SOCIAL ACHIEVEMENTS (sex-neutral)
  // ═══════════════════════════════════════
  {
    id: 'first_friend',
    name: 'Social Lifter',
    description: 'Add your first friend',
    category: 'social',
    rarity: 'common',
    check: (s) => s.friendCount >= 1,
  },
  {
    id: 'five_friends',
    name: 'Crew Deep',
    description: 'Have 5 friends',
    category: 'social',
    rarity: 'uncommon',
    check: (s) => s.friendCount >= 5,
  },
  {
    id: 'ten_friends',
    name: 'The Squad',
    description: 'Have 10 friends',
    category: 'social',
    rarity: 'rare',
    check: (s) => s.friendCount >= 10,
  },

  // ═══════════════════════════════════════
  // CONSISTENCY ACHIEVEMENTS (sex-neutral)
  // ═══════════════════════════════════════
  {
    id: 'three_day_streak',
    name: 'Getting Going',
    description: 'Work out 3 days in a week',
    category: 'consistency',
    rarity: 'common',
    check: (s) => (s.bestWeeklyDays || 0) >= 3,
  },
  {
    id: 'five_day_streak',
    name: 'Dedicated Athlete',
    description: 'Work out 5 days in a week',
    category: 'consistency',
    rarity: 'uncommon',
    check: (s) => (s.bestWeeklyDays || 0) >= 5,
  },
  {
    id: 'seven_day_streak',
    name: 'No Rest Days',
    description: 'Work out 7 days in a week',
    category: 'consistency',
    rarity: 'rare',
    check: (s) => (s.bestWeeklyDays || 0) >= 7,
  },
];

/**
 * Resolve the rarity for an achievement given the current stats.
 * Rarity can be a string or a function of stats.
 */
export function resolveRarity(achievement, stats) {
  if (typeof achievement.rarity === 'function') {
    return achievement.rarity(stats);
  }
  return achievement.rarity;
}

// Rarity colors for premium achievement styling
export const RARITY_COLORS = {
  common: { bg: '#6b7280', border: '#9ca3af', glow: 'rgba(107,114,128,0.15)' },
  uncommon: { bg: '#22c55e', border: '#4ade80', glow: 'rgba(34,197,94,0.15)' },
  rare: { bg: '#3b82f6', border: '#60a5fa', glow: 'rgba(59,130,246,0.15)' },
  epic: { bg: '#a855f7', border: '#c084fc', glow: 'rgba(168,85,247,0.15)' },
  legendary: { bg: '#f59e0b', border: '#fbbf24', glow: 'rgba(245,158,11,0.2)' },
};

// Badge icon SVG paths by category
export const BADGE_ICONS = {
  milestones: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  strength: 'M6.5 6.5h11M6.5 17.5h11M4 6.5V17.5M20 6.5V17.5M2 9v6M22 9v6',
  clubs: 'M8 21V11M16 21V5M12 21V15M4 21h16',
  social: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  consistency: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
};

export function computeStats({ lifts, prs, bodyweightLogs, friends, tierMap, e1rmMap, workoutDays, sex }) {
  const tiers = Object.values(tierMap);

  // Calculate best weekly workout days from lift data
  const weekMap = {};
  for (const log of lifts) {
    const d = new Date(log.logged_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    const dayKey = d.toISOString().split('T')[0];
    if (!weekMap[weekKey]) weekMap[weekKey] = new Set();
    weekMap[weekKey].add(dayKey);
  }
  // Also include workout check-ins
  if (workoutDays) {
    for (const day of workoutDays) {
      const d = new Date(day);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!weekMap[weekKey]) weekMap[weekKey] = new Set();
      weekMap[weekKey].add(day);
    }
  }
  const bestWeeklyDays = Object.values(weekMap).reduce((max, days) => Math.max(max, days.size), 0);

  return {
    totalLifts: lifts.length,
    exerciseCount: new Set(lifts.map(l => l.exercise_name)).size,
    tiers,
    tierMap,
    e1rmMap,
    friendCount: friends.length,
    bwLogCount: bodyweightLogs.length,
    bestWeeklyDays,
    sex: sex || 'male',
  };
}

export function getEarnedAchievements(stats) {
  return ACHIEVEMENTS.filter(a => a.check(stats)).map(a => ({
    ...a,
    // Resolve rarity at earn-time so it's always a string from here on
    rarity: resolveRarity(a, stats),
  }));
}
