import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    setLoading(true);
    try {
      const data = isSignup
        ? await api.signup(username, pin, displayName || username)
        : await api.login(username, pin);
      login(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6 overflow-hidden bg-dark-900">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display font-extrabold text-5xl text-white tracking-tight">
            STRENGTH<span className="text-primary">CHARTS</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Track. Compete. Dominate.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              autoCapitalize="none"
              autoComplete="username"
              required
            />
          </div>

          {isSignup && (
            <div>
              <input
                type="text"
                placeholder="Display Name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
              />
            </div>
          )}

          <div>
            <input
              type="tel"
              placeholder="6-Digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field text-center tracking-[0.5em] text-2xl font-display"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '...' : isSignup ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignup(!isSignup); setError(''); }}
          className="w-full text-center text-gray-400 text-sm mt-6 py-2"
        >
          {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
