// Determine API base URL based on platform
function getBaseUrl() {
  // Check for Capacitor native platform
  if (window.Capacitor?.isNativePlatform()) {
    // Point to your hosted backend for native builds
    // Replace this URL when you deploy your backend
    return import.meta.env.VITE_API_URL || 'http://192.168.1.87:3001/api';
  }
  // Web: relative path works with Vite proxy (dev) and same-origin (prod)
  return import.meta.env.VITE_API_URL || '/api';
}

const BASE = getBaseUrl();

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username, pin) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, pin }) }),
  signup: (username, pin, display_name, email) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ username, pin, display_name, email }) }),
  forgotPin: (email) => request('/auth/forgot-pin', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPin: (email, code, new_pin) => request('/auth/reset-pin', { method: 'POST', body: JSON.stringify({ email, code, new_pin }) }),
  updateUser: (id, data) => request(`/auth/user/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePremiumStatus: (id, is_premium) => request(`/auth/user/${id}/premium`, { method: 'PUT', body: JSON.stringify({ is_premium }) }),

  // Lifts
  getLifts: (userId) => request(`/lifts/${userId}`),
  getExercises: (userId) => request(`/lifts/${userId}/exercises`),
  getExerciseLogs: (userId, name) => request(`/lifts/${userId}/exercise/${encodeURIComponent(name)}`),
  getPRs: (userId) => request(`/lifts/${userId}/prs`),
  logLift: (data) => request('/lifts', { method: 'POST', body: JSON.stringify(data) }),
  deleteLift: (id) => request(`/lifts/${id}`, { method: 'DELETE' }),
  deleteExerciseLogs: (userId, name) => request(`/lifts/${userId}/exercise/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  // Bodyweight
  getBodyweight: (userId) => request(`/bodyweight/${userId}`),
  getLatestBodyweight: (userId) => request(`/bodyweight/${userId}/latest`),
  logBodyweight: (data) => request('/bodyweight', { method: 'POST', body: JSON.stringify(data) }),
  deleteBodyweight: (id) => request(`/bodyweight/${id}`, { method: 'DELETE' }),

  // Leaderboard
  getLeaderboard: (userId) => request(`/leaderboard${userId ? `?userId=${userId}` : ''}`),

  // Friends
  getFriends: (userId) => request(`/friends/${userId}`),
  getPendingRequests: (userId) => request(`/friends/${userId}/pending`),
  searchUsers: (userId, q) => request(`/friends/search?userId=${userId}&q=${encodeURIComponent(q)}`),
  addFriend: (user_id, friend_id) => request('/friends', { method: 'POST', body: JSON.stringify({ user_id, friend_id }) }),
  acceptFriend: (user_id, friend_id) => request('/friends/accept', { method: 'PUT', body: JSON.stringify({ user_id, friend_id }) }),
  declineFriend: (user_id, friend_id) => request('/friends/decline', { method: 'PUT', body: JSON.stringify({ user_id, friend_id }) }),
  removeFriend: (user_id, friend_id) => request('/friends', { method: 'DELETE', body: JSON.stringify({ user_id, friend_id }) }),
  getFriendProfile: (userId, friendId) => request(`/friends/${userId}/profile/${friendId}`),
};
