import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset'
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setResetCode('');
    setNewPin('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(username, pin);
      login(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const data = await api.signup(username, pin, displayName || username, email);
      login(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await api.forgotPin(email);
      setSuccess('Reset code sent! Check your email.');
      setMode('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (resetCode.length !== 6 || !/^\d{6}$/.test(resetCode)) {
      setError('Reset code must be 6 digits');
      return;
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError('New PIN must be exactly 6 digits');
      return;
    }
    setLoading(true);
    try {
      await api.resetPin(email, resetCode, newPin);
      setSuccess('PIN reset successfully!');
      setTimeout(() => {
        switchMode('login');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center bg-black overflow-hidden">
    <div className="w-full max-w-lg flex flex-col items-center justify-center px-6 bg-dark-900 sm:border-x sm:border-dark-600">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display font-extrabold text-5xl text-white tracking-tight">
            STRENGTH<span className="text-primary">CHARTS</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Track. Compete. Dominate.</p>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
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
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? '...' : 'Log In'}
              </button>
            </form>

            <button
              onClick={() => switchMode('forgot')}
              className="w-full text-center text-primary/70 text-sm mt-4 py-1"
            >
              Forgot PIN?
            </button>
            <button
              onClick={() => switchMode('signup')}
              className="w-full text-center text-gray-400 text-sm mt-1 py-2"
            >
              Don't have an account? Sign up
            </button>
          </>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <>
            <form onSubmit={handleSignup} className="space-y-4">
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
              <input
                type="text"
                placeholder="Display Name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                autoCapitalize="none"
                autoComplete="email"
                required
              />
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
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? '...' : 'Create Account'}
              </button>
            </form>
            <button
              onClick={() => switchMode('login')}
              className="w-full text-center text-gray-400 text-sm mt-6 py-2"
            >
              Already have an account? Log in
            </button>
          </>
        )}

        {/* Forgot PIN — Enter Email */}
        {mode === 'forgot' && (
          <>
            <div className="text-center mb-6">
              <h2 className="font-display font-bold text-xl text-white">RESET PIN</h2>
              <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset code</p>
            </div>
            <form onSubmit={handleForgotPin} className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                autoCapitalize="none"
                autoComplete="email"
                required
              />
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              {success && <p className="text-green-400 text-sm text-center">{success}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
            <button
              onClick={() => switchMode('login')}
              className="w-full text-center text-gray-400 text-sm mt-6 py-2"
            >
              Back to login
            </button>
          </>
        )}

        {/* Reset PIN — Enter Code + New PIN */}
        {mode === 'reset' && (
          <>
            <div className="text-center mb-6">
              <h2 className="font-display font-bold text-xl text-white">ENTER RESET CODE</h2>
              <p className="text-gray-500 text-sm mt-1">Check your email for the 6-digit code</p>
            </div>
            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">Reset Code</label>
                <input
                  type="tel"
                  placeholder="6-digit code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center tracking-[0.5em] text-2xl font-display"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">New PIN</label>
                <input
                  type="tel"
                  placeholder="New 6-digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center tracking-[0.5em] text-2xl font-display"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              {success && (
                <div className="bg-green-900/30 border border-green-700 text-green-400 text-center py-3 rounded-lg font-display font-bold uppercase">
                  {success}
                </div>
              )}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset PIN'}
              </button>
            </form>
            <button
              onClick={() => switchMode('forgot')}
              className="w-full text-center text-gray-400 text-sm mt-4 py-1"
            >
              Didn't get the code? Resend
            </button>
            <button
              onClick={() => switchMode('login')}
              className="w-full text-center text-gray-400 text-sm mt-1 py-2"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
