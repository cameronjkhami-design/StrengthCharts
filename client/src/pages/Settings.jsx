import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { getPrimaryColor, THEME_COLORS, applyThemeColor } from '../utils/colors';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState(() => {
    const ps = user?.privacy_settings;
    if (typeof ps === 'string') {
      try { return JSON.parse(ps); } catch { return {}; }
    }
    return ps || {};
  });

  // Haptics setting (persisted in localStorage)
  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    const saved = localStorage.getItem('sc_haptics');
    return saved !== 'false'; // default on
  });

  const handleTogglePrivacy = async (key) => {
    const updated = { ...privacySettings, [key]: privacySettings[key] === false ? true : false };
    setPrivacySettings(updated);
    try {
      const data = await api.updateUser(user.id, { privacy_settings: updated });
      updateUser(data.user);
    } catch (err) {
      console.error(err);
      setPrivacySettings(privacySettings);
    }
  };

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    localStorage.setItem('sc_haptics', String(next));
  };

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      {/* Back button */}
      <button onClick={() => navigate('/profile')} className="text-primary text-sm font-display font-bold uppercase mb-4 flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6" /></svg>
        Profile
      </button>

      <h1 className="font-display font-extrabold text-3xl text-white mb-5">Settings</h1>

      {/* Sex Selection */}
      <div className="card mb-3">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-1">Profile</h3>
        <p className="text-gray-500 text-[10px] mb-3">Used for achievement rarity and strength standards</p>
        <div className="flex gap-2">
          {[
            { value: 'male', label: 'Male', icon: '♂' },
            { value: 'female', label: 'Female', icon: '♀' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={async () => {
                try {
                  const data = await api.updateUser(user.id, { sex: opt.value });
                  updateUser(data.user);
                } catch (err) {
                  console.error(err);
                }
              }}
              className={`flex-1 py-3 rounded-xl font-display font-bold text-sm uppercase transition-all flex items-center justify-center gap-2 ${
                user.sex === opt.value
                  ? 'bg-primary text-dark-900 border-2 border-primary'
                  : 'bg-dark-700 text-gray-400 border border-dark-500'
              }`}
            >
              <span className="text-lg">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weight Unit */}
      <div className="card mb-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-sm uppercase text-gray-400">Weight Unit</h3>
            <p className="text-gray-500 text-[10px]">Display weights in lbs or kg</p>
          </div>
          <button
            onClick={async () => {
              const newUnit = (user?.unit_pref || 'lbs') === 'lbs' ? 'kg' : 'lbs';
              try {
                const data = await api.updateUser(user.id, { unit_pref: newUnit });
                updateUser(data.user);
              } catch (err) {
                console.error(err);
              }
            }}
            className="bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 font-display font-bold text-sm"
          >
            {(user?.unit_pref || 'lbs') === 'lbs' ? 'LBS' : 'KG'}
            <span className="text-gray-500 ml-2">tap to switch</span>
          </button>
        </div>
      </div>

      {/* Theme Color */}
      <div className="card mb-3">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">Theme Color</h3>
        <div className="flex gap-3 flex-wrap">
          {THEME_COLORS.map(({ name, value }) => (
            <button
              key={value}
              onClick={async () => {
                applyThemeColor(value);
                try {
                  const data = await api.updateUser(user.id, { theme_color: value });
                  updateUser(data.user);
                } catch (err) {
                  console.error(err);
                  applyThemeColor(user.theme_color);
                }
              }}
              className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 ${
                (user.theme_color || '#FFD700') === value
                  ? 'border-white scale-110'
                  : 'border-dark-500'
              }`}
              style={{ backgroundColor: value }}
              title={name}
            />
          ))}
        </div>
      </div>

      {/* Haptics Toggle */}
      <div className="card mb-3">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">Haptics</h3>
        <div className="flex items-center justify-between py-2 px-3 bg-dark-700 rounded-lg">
          <div>
            <p className="text-white text-sm font-display font-semibold">Vibration Feedback</p>
            <p className="text-gray-500 text-[10px]">Haptic feedback on taps and actions</p>
          </div>
          <button
            onClick={handleToggleHaptics}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              hapticsEnabled ? 'bg-primary' : 'bg-dark-500'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              hapticsEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Friend Visibility */}
      <div className="card mb-3">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 flex items-center gap-2 mb-3">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Friend Visibility
        </h3>
        <p className="text-gray-500 text-xs mb-3">Choose what friends can see on your profile</p>
        <div className="space-y-2">
          {[
            { key: 'show_prs', label: 'Personal Records', desc: 'PRs, tier badges, and percentiles' },
            { key: 'show_lifts', label: 'Lift History', desc: 'Progress charts and exercise logs' },
            { key: 'show_bodyweight', label: 'Bodyweight', desc: 'Current weight and trend chart' },
            { key: 'show_achievements', label: 'Achievements', desc: 'Earned badges and showcase' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 px-3 bg-dark-700 rounded-lg">
              <div>
                <p className="text-white text-sm font-display font-semibold">{label}</p>
                <p className="text-gray-500 text-[10px]">{desc}</p>
              </div>
              <button
                onClick={() => handleTogglePrivacy(key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  privacySettings[key] !== false ? 'bg-primary' : 'bg-dark-500'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  privacySettings[key] !== false ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
