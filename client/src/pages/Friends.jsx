import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../utils/api';

export default function Friends() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFriends = useCallback(() => {
    api.getFriends(user.id)
      .then(data => setFriends(data.friends))
      .catch(console.error);
  }, [user.id]);

  const loadPending = useCallback(() => {
    api.getPendingRequests(user.id)
      .then(data => setPendingRequests(data.requests))
      .catch(console.error);
  }, [user.id]);

  useEffect(() => {
    Promise.all([
      api.getFriends(user.id).then(data => setFriends(data.friends)),
      api.getPendingRequests(user.id).then(data => setPendingRequests(data.requests)),
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

  const handleSendRequest = async (friendId) => {
    try {
      const targetUser = searchResults.find(u => u.id === friendId);
      const name = targetUser?.display_name || targetUser?.username || 'User';
      const result = await api.addFriend(user.id, friendId);
      if (result.status === 'accepted') {
        loadFriends();
        setSearchResults(prev => prev.map(u =>
          u.id === friendId ? { ...u, friend_status: 'accepted' } : u
        ));
        addNotification(`You and ${name} are now friends!`, 'friend');
      } else {
        setSearchResults(prev => prev.map(u =>
          u.id === friendId ? { ...u, friend_status: 'pending_sent' } : u
        ));
        addNotification(`Friend request sent to ${name}`, 'friend');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptRequest = async (friendId) => {
    try {
      const req = pendingRequests.find(r => r.id === friendId);
      const name = req?.display_name || req?.username || 'User';
      await api.acceptFriend(user.id, friendId);
      setPendingRequests(prev => prev.filter(r => r.id !== friendId));
      loadFriends();
      addNotification(`${name} added as friend!`, 'friend');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineRequest = async (friendId) => {
    try {
      await api.declineFriend(user.id, friendId);
      setPendingRequests(prev => prev.filter(r => r.id !== friendId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId, e) => {
    e.stopPropagation();
    try {
      await api.removeFriend(user.id, friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
      setSearchResults(prev => prev.map(u =>
        u.id === friendId ? { ...u, friend_status: 'none' } : u
      ));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-primary font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-display font-extrabold text-3xl text-white">Friends</h1>
        <p className="text-gray-500 text-sm">{friends.length} friend{friends.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search users to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field text-sm pl-10"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.trim().length >= 2 && (
        <div className="mb-4 space-y-1">
          {searching && <p className="text-gray-500 text-xs text-center py-2">Searching...</p>}
          {!searching && searchResults.length === 0 && (
            <p className="text-gray-500 text-xs text-center py-2">No users found</p>
          )}
          {searchResults.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2.5 px-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
                  <span className="font-display font-bold text-xs text-primary">
                    {(u.display_name || u.username || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white text-sm font-display font-semibold uppercase">
                    {u.display_name || u.username}
                  </p>
                  <p className="text-gray-500 text-xs">@{u.username}</p>
                </div>
              </div>
              {u.friend_status === 'accepted' ? (
                <button
                  onClick={(e) => handleRemoveFriend(u.id, e)}
                  className="text-red-400 text-xs font-display font-bold uppercase px-3 py-1.5 border border-red-400/30 rounded-lg"
                >
                  Remove
                </button>
              ) : u.friend_status === 'pending_sent' ? (
                <span className="text-gray-400 text-xs font-display font-bold uppercase px-3 py-1.5 border border-dark-500 rounded-lg">
                  Pending
                </span>
              ) : u.friend_status === 'pending_received' ? (
                <button
                  onClick={() => handleAcceptRequest(u.id)}
                  className="bg-primary text-dark-900 text-xs font-display font-bold uppercase px-3 py-1.5 rounded-lg"
                >
                  Accept
                </button>
              ) : (
                <button
                  onClick={() => handleSendRequest(u.id)}
                  className="bg-primary text-dark-900 text-xs font-display font-bold uppercase px-3 py-1.5 rounded-lg"
                >
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending Friend Requests */}
      {pendingRequests.length > 0 && (
        <div className="card mb-4 border-primary/30 bg-primary/5">
          <h3 className="font-display font-bold text-sm uppercase text-primary mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-1">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between py-2.5 px-3 bg-dark-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
                    <span className="font-display font-bold text-xs text-primary">
                      {(req.display_name || req.username || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-display font-semibold uppercase">
                      {req.display_name || req.username}
                    </p>
                    <p className="text-gray-500 text-xs">@{req.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req.id)}
                    className="bg-primary text-dark-900 text-xs font-display font-bold uppercase px-3 py-1.5 rounded-lg"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.id)}
                    className="text-gray-400 text-xs font-display font-bold uppercase px-3 py-1.5 border border-dark-500 rounded-lg"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      {friends.length > 0 ? (
        <div className="space-y-2">
          {friends.map(friend => (
            <div
              key={friend.id}
              onClick={() => navigate(`/friends/${friend.id}`)}
              className="flex items-center justify-between py-3 px-4 bg-dark-800 border border-dark-600 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="font-display font-extrabold text-sm text-dark-900">
                    {(friend.display_name || friend.username || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white text-sm font-display font-bold uppercase">
                    {friend.display_name || friend.username}
                  </p>
                  <p className="text-gray-500 text-xs">@{friend.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleRemoveFriend(friend.id, e)}
                  className="text-red-400/60 hover:text-red-400 transition-colors p-1.5"
                  title="Remove friend"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="18" y1="11" x2="23" y2="11" />
                  </svg>
                </button>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery.trim().length < 2 ? (
        <div className="card text-center py-10">
          <svg viewBox="0 0 24 24" className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          <p className="text-gray-400 mb-1">No friends yet</p>
          <p className="text-gray-600 text-sm">Search above to find and add friends</p>
        </div>
      ) : null}
    </div>
  );
}
