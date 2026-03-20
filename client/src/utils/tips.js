// Training tips organized by exercise — generated based on user's logged lifts
// Each exercise has tips for different skill levels

const EXERCISE_TIPS = {
  'Squat': [
    { tip: 'Focus on hitting parallel depth before adding weight', level: 'beginner' },
    { tip: 'Drive your knees out over your toes to activate your glutes', level: 'beginner' },
    { tip: 'Try paused squats (2-3 sec) to build strength out of the hole', level: 'intermediate' },
    { tip: 'Add tempo work: 3 seconds down, 1 second pause, explode up', level: 'intermediate' },
    { tip: 'Consider a belt for sets above 80% 1RM for core stability', level: 'advanced' },
    { tip: 'Vary your stance width every few weeks to target different muscles', level: 'advanced' },
  ],
  'Bench Press': [
    { tip: 'Retract your shoulder blades and arch slightly for a stable base', level: 'beginner' },
    { tip: 'Keep your feet flat on the floor and drive through your legs', level: 'beginner' },
    { tip: 'Try close-grip bench to strengthen your lockout', level: 'intermediate' },
    { tip: 'Add paused reps at the chest to build explosive power', level: 'intermediate' },
    { tip: 'Use board press or floor press to work through sticking points', level: 'advanced' },
    { tip: 'Program a deload week every 4-6 weeks to prevent plateaus', level: 'advanced' },
  ],
  'Deadlift': [
    { tip: 'Keep the bar close to your shins — drag it up your legs', level: 'beginner' },
    { tip: 'Brace your core hard before every pull — breathe into your belly', level: 'beginner' },
    { tip: 'Try deficit deadlifts to build strength off the floor', level: 'intermediate' },
    { tip: 'Add Romanian deadlifts as an accessory for hamstring development', level: 'intermediate' },
    { tip: 'Alternate between conventional and sumo every training block', level: 'advanced' },
    { tip: 'Use block pulls to overload the lockout above your max', level: 'advanced' },
  ],
  'Overhead Press': [
    { tip: 'Start with the bar on your front delts, then press straight up', level: 'beginner' },
    { tip: 'Squeeze your glutes and brace your abs — press from a solid base', level: 'beginner' },
    { tip: 'Add push press with heavier weight to overload the negative', level: 'intermediate' },
    { tip: 'Z-press (seated on floor) eliminates leg drive for pure shoulder strength', level: 'intermediate' },
    { tip: 'Focus on lateral raises and face pulls as accessories', level: 'advanced' },
  ],
  'Barbell Row': [
    { tip: 'Keep your torso around 45° and pull to your belly button', level: 'beginner' },
    { tip: 'Squeeze your shoulder blades together at the top of each rep', level: 'beginner' },
    { tip: 'Try Pendlay rows (from the floor) for explosive back power', level: 'intermediate' },
    { tip: 'Superset rows with face pulls for complete back development', level: 'intermediate' },
  ],
  'Pull-ups': [
    { tip: 'Start with negatives (jump up, slow 5-sec lowering) to build strength', level: 'beginner' },
    { tip: 'Use a band for assistance until you can do 5 unassisted', level: 'beginner' },
    { tip: 'Add weight with a belt once you can do 10+ clean reps', level: 'intermediate' },
    { tip: 'Vary your grip width and style (chin-ups vs pull-ups) each session', level: 'intermediate' },
  ],
  'Incline Bench Press': [
    { tip: 'Set the bench to 30-45° for optimal upper chest activation', level: 'beginner' },
    { tip: 'Control the negative — 2-3 second descent builds more muscle', level: 'intermediate' },
    { tip: 'Pair with flat bench on separate days for balanced chest development', level: 'advanced' },
  ],
  'Romanian Deadlift': [
    { tip: 'Push your hips back like closing a door with your butt', level: 'beginner' },
    { tip: 'Feel the stretch in your hamstrings — don\'t round your back', level: 'beginner' },
    { tip: 'Try single-leg RDLs to fix imbalances and improve stability', level: 'intermediate' },
  ],
  'Front Squat': [
    { tip: 'Work on wrist and thoracic mobility to keep elbows high', level: 'beginner' },
    { tip: 'Cross-arm grip is fine if front rack is uncomfortable', level: 'beginner' },
    { tip: 'Front squats build quads and core better than back squats', level: 'intermediate' },
  ],
};

// General training tips (shown when exercise-specific tips don't apply)
const GENERAL_TIPS = [
  { tip: 'Progressive overload: add weight, reps, or sets over time', level: 'beginner' },
  { tip: 'Sleep 7-9 hours — recovery is when muscles actually grow', level: 'beginner' },
  { tip: 'Eat 1g of protein per pound of bodyweight daily', level: 'beginner' },
  { tip: 'Track your lifts consistently to identify plateaus early', level: 'beginner' },
  { tip: 'Warm up with lighter sets before your working weight', level: 'beginner' },
  { tip: 'Deload every 4-6 weeks: reduce volume by 40% for a week', level: 'intermediate' },
  { tip: 'Periodize your training: alternate heavy and volume phases', level: 'intermediate' },
  { tip: 'Don\'t neglect accessories — they build the weak links', level: 'intermediate' },
  { tip: 'RPE 7-8 is the sweet spot for most training sets', level: 'intermediate' },
  { tip: 'Record your form to catch technique breakdown under heavy loads', level: 'advanced' },
  { tip: 'Competition-style training 4-6 weeks before testing maxes', level: 'advanced' },
];

/**
 * Generate personalized tips based on the user's logged exercises and tiers
 * @param {Object} opts
 * @param {string[]} opts.exercises - exercise names the user has logged
 * @param {Object} opts.tierMap - { exerciseName: tierName } for the user
 * @returns {{ exercise: string|null, tip: string, level: string }[]} - array of tips grouped by category
 */
export function generateTips({ exercises = [], tierMap = {} }) {
  const tips = [];

  // Get the user's overall level
  const tiers = Object.values(tierMap);
  const userLevel = tiers.some(t => ['Advanced', 'Elite', 'World Class'].includes(t))
    ? 'advanced'
    : tiers.some(t => ['Intermediate'].includes(t))
    ? 'intermediate'
    : 'beginner';

  // Get exercise-specific tips
  for (const exercise of exercises) {
    const exerciseTips = EXERCISE_TIPS[exercise];
    if (!exerciseTips) continue;

    // Filter tips appropriate for user level
    const relevant = exerciseTips.filter(t => {
      if (userLevel === 'advanced') return true; // show all
      if (userLevel === 'intermediate') return t.level !== 'advanced';
      return t.level === 'beginner';
    });

    if (relevant.length > 0) {
      // Pick a random tip for this exercise
      const pick = relevant[Math.floor(Math.random() * relevant.length)];
      tips.push({ exercise, ...pick });
    }
  }

  // Add some general tips
  const generalRelevant = GENERAL_TIPS.filter(t => {
    if (userLevel === 'advanced') return true;
    if (userLevel === 'intermediate') return t.level !== 'advanced';
    return t.level === 'beginner';
  });

  // Pick 2 general tips
  const shuffled = [...generalRelevant].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(2, shuffled.length); i++) {
    tips.push({ exercise: null, ...shuffled[i] });
  }

  return tips;
}

/**
 * Get a daily seed so tips change daily but stay consistent within the day
 */
export function getDailySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Seeded random for consistent daily tips
 */
export function seededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const chr = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get daily tips (consistent within the same day)
 */
export function getDailyTips({ exercises = [], tierMap = {} }) {
  const seed = getDailySeed();
  const tips = [];

  const tiers = Object.values(tierMap);
  const userLevel = tiers.some(t => ['Advanced', 'Elite', 'World Class'].includes(t))
    ? 'advanced'
    : tiers.some(t => ['Intermediate'].includes(t))
    ? 'intermediate'
    : 'beginner';

  // Pick one tip per exercise (using seed for consistency)
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    const exerciseTips = EXERCISE_TIPS[exercise];
    if (!exerciseTips) continue;

    const relevant = exerciseTips.filter(t => {
      if (userLevel === 'advanced') return true;
      if (userLevel === 'intermediate') return t.level !== 'advanced';
      return t.level === 'beginner';
    });

    if (relevant.length > 0) {
      const idx = seededRandom(seed + exercise) % relevant.length;
      tips.push({ exercise, ...relevant[idx] });
    }
  }

  // Add 2 general tips
  const generalRelevant = GENERAL_TIPS.filter(t => {
    if (userLevel === 'advanced') return true;
    if (userLevel === 'intermediate') return t.level !== 'advanced';
    return t.level === 'beginner';
  });

  for (let g = 0; g < Math.min(2, generalRelevant.length); g++) {
    const idx = seededRandom(seed + 'general' + g) % generalRelevant.length;
    tips.push({ exercise: null, ...generalRelevant[idx] });
  }

  // Limit to 5 tips total
  return tips.slice(0, 5);
}
