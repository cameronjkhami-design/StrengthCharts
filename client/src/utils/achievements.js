// Achievement definitions
// Each achievement has an id, name, description, icon (emoji-free SVG path), and a check function
// check(stats) returns true if the achievement is earned

export const ACHIEVEMENTS = [
  // Lift count milestones
  {
    id: 'first_lift',
    name: 'First Rep',
    description: 'Log your first lift',
    category: 'milestones',
    check: (s) => s.totalLifts >= 1,
  },
  {
    id: 'ten_lifts',
    name: 'Getting Started',
    description: 'Log 10 lifts',
    category: 'milestones',
    check: (s) => s.totalLifts >= 10,
  },
  {
    id: 'fifty_lifts',
    name: 'Dedicated',
    description: 'Log 50 lifts',
    category: 'milestones',
    check: (s) => s.totalLifts >= 50,
  },
  {
    id: 'hundred_lifts',
    name: 'Iron Addict',
    description: 'Log 100 lifts',
    category: 'milestones',
    check: (s) => s.totalLifts >= 100,
  },

  // Strength tiers
  {
    id: 'first_advanced',
    name: 'Advanced Lifter',
    description: 'Reach Advanced tier on any lift',
    category: 'strength',
    check: (s) => s.tiers.some(t => ['Advanced', 'Elite', 'World Class'].includes(t)),
  },
  {
    id: 'first_elite',
    name: 'Elite Status',
    description: 'Reach Elite tier on any lift',
    category: 'strength',
    check: (s) => s.tiers.some(t => ['Elite', 'World Class'].includes(t)),
  },
  {
    id: 'all_advanced',
    name: 'Well Rounded',
    description: 'Reach Advanced on Squat, Bench & Deadlift',
    category: 'strength',
    check: (s) => {
      const main = ['Squat', 'Bench Press', 'Deadlift'];
      return main.every(lift => {
        const tier = s.tierMap[lift];
        return tier && ['Advanced', 'Elite', 'World Class'].includes(tier);
      });
    },
  },
  {
    id: 'world_class',
    name: 'World Class',
    description: 'Reach World Class tier on any lift',
    category: 'strength',
    check: (s) => s.tiers.some(t => t === 'World Class'),
  },

  // Big number clubs
  {
    id: 'two_plate_bench',
    name: '2 Plate Bench',
    description: 'Bench Press 100kg / 225lbs (e1RM)',
    category: 'clubs',
    check: (s) => (s.e1rmMap['Bench Press'] || 0) >= 100,
  },
  {
    id: 'three_plate_squat',
    name: '3 Plate Squat',
    description: 'Squat 140kg / 315lbs (e1RM)',
    category: 'clubs',
    check: (s) => (s.e1rmMap['Squat'] || 0) >= 140,
  },
  {
    id: 'four_plate_deadlift',
    name: '4 Plate Deadlift',
    description: 'Deadlift 180kg / 405lbs (e1RM)',
    category: 'clubs',
    check: (s) => (s.e1rmMap['Deadlift'] || 0) >= 180,
  },
  {
    id: 'thousand_pound_club',
    name: '1000lb Club',
    description: 'SBD total over 453kg / 1000lbs (e1RM)',
    category: 'clubs',
    check: (s) => {
      const squat = s.e1rmMap['Squat'] || 0;
      const bench = s.e1rmMap['Bench Press'] || 0;
      const dead = s.e1rmMap['Deadlift'] || 0;
      return (squat + bench + dead) >= 453;
    },
  },

  // Social
  {
    id: 'first_friend',
    name: 'Social Lifter',
    description: 'Add your first friend',
    category: 'social',
    check: (s) => s.friendCount >= 1,
  },
  {
    id: 'five_friends',
    name: 'Crew Deep',
    description: 'Have 5 friends',
    category: 'social',
    check: (s) => s.friendCount >= 5,
  },

  // Bodyweight
  {
    id: 'track_bw',
    name: 'Weight Watcher',
    description: 'Log your bodyweight',
    category: 'milestones',
    check: (s) => s.bwLogCount >= 1,
  },

  // Variety
  {
    id: 'five_exercises',
    name: 'Variety Pack',
    description: 'Log 5 different exercises',
    category: 'milestones',
    check: (s) => s.exerciseCount >= 5,
  },
];

// Badge icon SVG paths by category
export const BADGE_ICONS = {
  milestones: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  strength: 'M6.5 6.5h11M6.5 17.5h11M4 6.5V17.5M20 6.5V17.5M2 9v6M22 9v6',
  clubs: 'M8 21V11M16 21V5M12 21V15M4 21h16',
  social: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
};

export function computeStats({ lifts, prs, bodyweightLogs, friends, tierMap, e1rmMap }) {
  const tiers = Object.values(tierMap);
  return {
    totalLifts: lifts.length,
    exerciseCount: new Set(lifts.map(l => l.exercise_name)).size,
    tiers,
    tierMap,
    e1rmMap,
    friendCount: friends.length,
    bwLogCount: bodyweightLogs.length,
  };
}

export function getEarnedAchievements(stats) {
  return ACHIEVEMENTS.filter(a => a.check(stats));
}
