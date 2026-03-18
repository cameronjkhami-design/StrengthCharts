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
};

export const TIER_COLORS = {
  'Untrained': '#6b7280',
  'Beginner': '#3b82f6',
  'Intermediate': '#22c55e',
  'Advanced': '#a855f7',
  'Elite': '#f59e0b',
  'World Class': '#ef4444',
};

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

export const MAIN_LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-ups'];
export const DEFAULT_EXERCISES = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-ups'];
