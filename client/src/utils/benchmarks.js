// Strength tiers based on bodyweight-relative 1RM
// Thresholds are multipliers of bodyweight
export const TIER_THRESHOLDS = {
  'Squat': [
    { tier: 'Untrained', min: 0, max: 0.5 },
    { tier: 'Beginner', min: 0.5, max: 0.75 },
    { tier: 'Intermediate', min: 0.75, max: 1.25 },
    { tier: 'Advanced', min: 1.25, max: 1.75 },
    { tier: 'Elite', min: 1.75, max: 2.25 },
    { tier: 'World Class', min: 2.25, max: 3.0 },
  ],
  'Bench Press': [
    { tier: 'Untrained', min: 0, max: 0.35 },
    { tier: 'Beginner', min: 0.35, max: 0.5 },
    { tier: 'Intermediate', min: 0.5, max: 0.75 },
    { tier: 'Advanced', min: 0.75, max: 1.15 },
    { tier: 'Elite', min: 1.15, max: 1.5 },
    { tier: 'World Class', min: 1.5, max: 2.0 },
  ],
  'Deadlift': [
    { tier: 'Untrained', min: 0, max: 0.6 },
    { tier: 'Beginner', min: 0.6, max: 1.0 },
    { tier: 'Intermediate', min: 1.0, max: 1.5 },
    { tier: 'Advanced', min: 1.5, max: 2.0 },
    { tier: 'Elite', min: 2.0, max: 2.5 },
    { tier: 'World Class', min: 2.5, max: 3.5 },
  ],
  'Overhead Press': [
    { tier: 'Untrained', min: 0, max: 0.2 },
    { tier: 'Beginner', min: 0.2, max: 0.35 },
    { tier: 'Intermediate', min: 0.35, max: 0.55 },
    { tier: 'Advanced', min: 0.55, max: 0.75 },
    { tier: 'Elite', min: 0.75, max: 1.0 },
    { tier: 'World Class', min: 1.0, max: 1.4 },
  ],
  'Barbell Row': [
    { tier: 'Untrained', min: 0, max: 0.3 },
    { tier: 'Beginner', min: 0.3, max: 0.5 },
    { tier: 'Intermediate', min: 0.5, max: 0.75 },
    { tier: 'Advanced', min: 0.75, max: 1.0 },
    { tier: 'Elite', min: 1.0, max: 1.25 },
    { tier: 'World Class', min: 1.25, max: 1.75 },
  ],
  'Incline DB Press': [
    { tier: 'Untrained', min: 0, max: 0.15 },
    { tier: 'Beginner', min: 0.15, max: 0.25 },
    { tier: 'Intermediate', min: 0.25, max: 0.4 },
    { tier: 'Advanced', min: 0.4, max: 0.55 },
    { tier: 'Elite', min: 0.55, max: 0.7 },
    { tier: 'World Class', min: 0.7, max: 1.0 },
  ],
  'Pendulum Squat': [
    { tier: 'Untrained', min: 0, max: 0.4 },
    { tier: 'Beginner', min: 0.4, max: 0.65 },
    { tier: 'Intermediate', min: 0.65, max: 1.0 },
    { tier: 'Advanced', min: 1.0, max: 1.5 },
    { tier: 'Elite', min: 1.5, max: 2.0 },
    { tier: 'World Class', min: 2.0, max: 2.75 },
  ],
  'Hack Squat': [
    { tier: 'Untrained', min: 0, max: 0.5 },
    { tier: 'Beginner', min: 0.5, max: 0.75 },
    { tier: 'Intermediate', min: 0.75, max: 1.25 },
    { tier: 'Advanced', min: 1.25, max: 1.75 },
    { tier: 'Elite', min: 1.75, max: 2.25 },
    { tier: 'World Class', min: 2.25, max: 3.0 },
  ],
  'Incline Bench Press': [
    { tier: 'Untrained', min: 0, max: 0.3 },
    { tier: 'Beginner', min: 0.3, max: 0.45 },
    { tier: 'Intermediate', min: 0.45, max: 0.65 },
    { tier: 'Advanced', min: 0.65, max: 0.95 },
    { tier: 'Elite', min: 0.95, max: 1.3 },
    { tier: 'World Class', min: 1.3, max: 1.7 },
  ],
  'Romanian Deadlift': [
    { tier: 'Untrained', min: 0, max: 0.4 },
    { tier: 'Beginner', min: 0.4, max: 0.7 },
    { tier: 'Intermediate', min: 0.7, max: 1.1 },
    { tier: 'Advanced', min: 1.1, max: 1.5 },
    { tier: 'Elite', min: 1.5, max: 2.0 },
    { tier: 'World Class', min: 2.0, max: 2.5 },
  ],
  'Front Squat': [
    { tier: 'Untrained', min: 0, max: 0.4 },
    { tier: 'Beginner', min: 0.4, max: 0.65 },
    { tier: 'Intermediate', min: 0.65, max: 1.0 },
    { tier: 'Advanced', min: 1.0, max: 1.45 },
    { tier: 'Elite', min: 1.45, max: 1.85 },
    { tier: 'World Class', min: 1.85, max: 2.5 },
  ],
  'Lat Pulldown': [
    { tier: 'Untrained', min: 0, max: 0.3 },
    { tier: 'Beginner', min: 0.3, max: 0.5 },
    { tier: 'Intermediate', min: 0.5, max: 0.7 },
    { tier: 'Advanced', min: 0.7, max: 0.9 },
    { tier: 'Elite', min: 0.9, max: 1.15 },
    { tier: 'World Class', min: 1.15, max: 1.5 },
  ],
  'Dumbbell Curl': [
    { tier: 'Untrained', min: 0, max: 0.08 },
    { tier: 'Beginner', min: 0.08, max: 0.15 },
    { tier: 'Intermediate', min: 0.15, max: 0.22 },
    { tier: 'Advanced', min: 0.22, max: 0.3 },
    { tier: 'Elite', min: 0.3, max: 0.4 },
    { tier: 'World Class', min: 0.4, max: 0.55 },
  ],
  'Dumbbell Shoulder Press': [
    { tier: 'Untrained', min: 0, max: 0.12 },
    { tier: 'Beginner', min: 0.12, max: 0.2 },
    { tier: 'Intermediate', min: 0.2, max: 0.35 },
    { tier: 'Advanced', min: 0.35, max: 0.5 },
    { tier: 'Elite', min: 0.5, max: 0.65 },
    { tier: 'World Class', min: 0.65, max: 0.85 },
  ],
  'Leg Press': [
    { tier: 'Untrained', min: 0, max: 0.8 },
    { tier: 'Beginner', min: 0.8, max: 1.3 },
    { tier: 'Intermediate', min: 1.3, max: 2.0 },
    { tier: 'Advanced', min: 2.0, max: 2.8 },
    { tier: 'Elite', min: 2.8, max: 3.5 },
    { tier: 'World Class', min: 3.5, max: 5.0 },
  ],
  'Cable Row': [
    { tier: 'Untrained', min: 0, max: 0.25 },
    { tier: 'Beginner', min: 0.25, max: 0.45 },
    { tier: 'Intermediate', min: 0.45, max: 0.65 },
    { tier: 'Advanced', min: 0.65, max: 0.85 },
    { tier: 'Elite', min: 0.85, max: 1.1 },
    { tier: 'World Class', min: 1.1, max: 1.5 },
  ],
  'Hip Thrust': [
    { tier: 'Untrained', min: 0, max: 0.5 },
    { tier: 'Beginner', min: 0.5, max: 0.85 },
    { tier: 'Intermediate', min: 0.85, max: 1.3 },
    { tier: 'Advanced', min: 1.3, max: 1.8 },
    { tier: 'Elite', min: 1.8, max: 2.3 },
    { tier: 'World Class', min: 2.3, max: 3.0 },
  ],
};

export const TIER_COLORS = {
  'Untrained': '#6b7280',
  'Beginner': '#3b82f6',
  'Intermediate': '#22c55e',
  'Advanced': '#a855f7',
  'Elite': '#f59e0b',
  'World Class': '#ef4444',
};

// Ordered list of tiers for legend display
export const TIER_ORDER = ['Untrained', 'Beginner', 'Intermediate', 'Advanced', 'Elite', 'World Class'];

export function getTier(exerciseName, ratio) {
  const thresholds = TIER_THRESHOLDS[exerciseName];
  if (!thresholds) return { tier: 'Unranked', color: '#6b7280', progress: 0 };

  let currentTier = thresholds[0];
  for (const t of thresholds) {
    if (ratio >= t.min) currentTier = t;
  }

  // Calculate progress toward next tier
  const currentIndex = thresholds.indexOf(currentTier);
  const nextTier = thresholds[currentIndex + 1];

  let progress = 100;
  if (nextTier) {
    const range = nextTier.min - currentTier.min;
    const current = ratio - currentTier.min;
    progress = Math.min(100, Math.max(0, (current / range) * 100));
  }

  return {
    tier: currentTier.tier,
    color: TIER_COLORS[currentTier.tier],
    progress: Math.round(progress),
    nextTier: nextTier ? nextTier.tier : null,
    nextThreshold: nextTier ? nextTier.min : null,
  };
}

export function calcE1RM(weight, reps) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Estimate what percentile of lifters a given BW ratio places you in
// Based on approximate population distribution across strength tiers
// Returns a number 0-99
export function getPercentile(exerciseName, ratio) {
  const thresholds = TIER_THRESHOLDS[exerciseName];
  if (!thresholds || ratio <= 0) return 0;

  // Approximate cumulative percentiles at tier boundaries
  // Untrained ~0-20%, Beginner ~20-40%, Intermediate ~40-65%,
  // Advanced ~65-85%, Elite ~85-97%, World Class ~97-100%
  const tierPercentiles = [
    { min: 0, pctStart: 0, pctEnd: 20 },      // Untrained
    { min: 0, pctStart: 20, pctEnd: 40 },      // Beginner
    { min: 0, pctStart: 40, pctEnd: 65 },      // Intermediate
    { min: 0, pctStart: 65, pctEnd: 85 },      // Advanced
    { min: 0, pctStart: 85, pctEnd: 97 },      // Elite
    { min: 0, pctStart: 97, pctEnd: 100 },     // World Class
  ];

  // Map thresholds to percentile ranges
  for (let i = 0; i < thresholds.length; i++) {
    tierPercentiles[i].min = thresholds[i].min;
    tierPercentiles[i].max = thresholds[i].max;
  }

  // Find which tier range the ratio falls in
  let tierIdx = 0;
  for (let i = 0; i < tierPercentiles.length; i++) {
    if (ratio >= tierPercentiles[i].min) tierIdx = i;
  }

  const t = tierPercentiles[tierIdx];
  const range = t.max - t.min;
  const progress = range > 0 ? Math.min(1, (ratio - t.min) / range) : 1;
  const percentile = Math.round(t.pctStart + progress * (t.pctEnd - t.pctStart));

  return Math.min(99, Math.max(1, percentile));
}

export const MAIN_LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-ups', 'Incline DB Press', 'Incline Bench Press', 'Front Squat', 'Romanian Deadlift', 'Pendulum Squat', 'Hack Squat', 'Leg Press', 'Hip Thrust', 'Lat Pulldown', 'Cable Row', 'Dumbbell Shoulder Press', 'Dumbbell Curl'];
export const DEFAULT_EXERCISES = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-ups', 'Incline DB Press', 'Incline Bench Press', 'Front Squat', 'Romanian Deadlift', 'Pendulum Squat', 'Hack Squat', 'Leg Press', 'Hip Thrust', 'Lat Pulldown', 'Cable Row', 'Dumbbell Shoulder Press', 'Dumbbell Curl'];
