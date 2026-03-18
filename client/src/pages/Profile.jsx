import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { api } from '../utils/api';
import { formatWeight, inputToKg, kgToDisplay, formatDate } from '../utils/conversions';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ProUpgradeModal from '../components/ProUpgradeModal';
import { usePurchases } from '../hooks/usePurchases';
import { PRIMARY_COLOR } from '../utils/colors';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { isPremium, isNative } = usePremium();
  const { restorePurchases, restoring } = usePurchases();
  const unit = user?.unit_pref || 'lbs';

  const [bwLogs, setBwLogs] = useState([]);
  const [newBW, setNewBW] = useState('');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Friends state
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadFriends = useCallback(() => {
    api.getFriends(user.id)
      .then(data => setFriends(data.friends))
      .catch(console.error);
  }, [user.id]);

  useEffect(() => {
    Promise.all([
      api.getBodyweight(user.id).then(data => setBwLogs(data.logs)),
      api.getFriends(user.id).then(data => setFriends(data.friends)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

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

  const handleAddFriend = async (friendId) => {
    try {
      await api.addFriend(user.id, friendId);
      loadFriends();
      // Update search results to reflect change
      setSearchResults(prev => prev.map(u =>
        u.id === friendId ? { ...u, is_friend: 1 } : u
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.removeFriend(user.id, friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
      setSearchResults(prev => prev.map(u =>
        u.id === friendId ? { ...u, is_friend: 0 } : u
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

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display font-extrabold text-3xl text-white">PROFILE</h1>
        {isPremium && (
          <span className="bg-primary/20 text-primary text-xs font-display font-bold uppercase px-2.5 py-1 rounded tracking-wider">
            PRO
          </span>
        )}
      </div>

      {/* Pro Upgrade Card */}
      {!isPremium && isNative && (
        <div className="card mb-4 border-primary/30 bg-primary/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-display font-bold text-white uppercase">Go Pro</p>
              <p className="text-gray-400 text-xs">$2.99/mo — unlock all features</p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-primary text-dark-900 font-display font-bold text-sm px-4 py-2 rounded-lg uppercase active:scale-95 transition-transform"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="card mb-4">
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
      <div className="card mb-4">
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

      {/* Friends Section */}
      <div className="card mb-4">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
          Friends ({friends.length})
        </h3>

        {/* Search to add */}
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
            {searching && (
              <p className="text-gray-500 text-xs text-center py-2">Searching...</p>
            )}
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
                {u.is_friend ? (
                  <button
                    onClick={() => handleRemoveFriend(u.id)}
                    className="text-red-400 text-xs font-display font-bold uppercase px-3 py-1.5 border border-red-400/30 rounded-lg"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddFriend(u.id)}
                    className="bg-primary text-dark-900 text-xs font-display font-bold uppercase px-3 py-1.5 rounded-lg"
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current Friends List */}
        {friends.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {friends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between py-2 px-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white text-sm font-display font-semibold uppercase">
                    {friend.display_name || friend.username}
                  </p>
                  <p className="text-gray-500 text-xs">@{friend.username}</p>
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

      {/* Log Bodyweight */}
      <div className="card mb-4">
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

      {/* BW Chart */}
      {chartData.length > 1 && (
        <div className="card mb-4">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-2">
            Bodyweight Over Time
          </h3>
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

      {/* BW History */}
      {bwLogs.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
            Bodyweight History
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {bwLogs.map(log => (
              <div key={log.id} className="flex justify-between items-center py-1.5 border-b border-dark-600 last:border-0">
                <span className="text-white font-display font-semibold">
                  {formatWeight(log.weight_kg, unit)}
                </span>
                <span className="text-gray-500 text-xs">{formatDate(log.logged_at)}</span>
              </div>
            ))}
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
