export function kgToLbs(kg) {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs) {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

export function formatWeight(kg, unit = 'lbs') {
  if (unit === 'kg') return `${Math.round(kg * 10) / 10} kg`;
  return `${Math.round(kgToLbs(kg) * 10) / 10} lbs`;
}

export function inputToKg(value, unit = 'lbs') {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return unit === 'kg' ? num : lbsToKg(num);
}

export function kgToDisplay(kg, unit = 'lbs') {
  if (unit === 'kg') return Math.round(kg * 10) / 10;
  return Math.round(kgToLbs(kg) * 10) / 10;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
