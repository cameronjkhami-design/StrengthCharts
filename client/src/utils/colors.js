// Primary accent color — reads from CSS variable set by user theme
// Used in Recharts components where Tailwind classes can't be applied
export function getPrimaryColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#FFD700';
}

// Default export for static contexts — components should prefer getPrimaryColor()
// for dynamic theme support
export const PRIMARY_COLOR = '#FFD700';

// Available theme colors
export const THEME_COLORS = [
  { name: 'Gold', value: '#FFD700' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
];

// Apply theme color to CSS variable
export function applyThemeColor(color) {
  document.documentElement.style.setProperty('--color-primary', color || '#FFD700');
}

// Light/dark mode
export function applyThemeMode(mode) {
  if (mode === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function getThemeMode() {
  return localStorage.getItem('sc_theme_mode') || 'dark';
}
