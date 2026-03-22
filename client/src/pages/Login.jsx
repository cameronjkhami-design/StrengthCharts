import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { setAuthToken } from '../utils/api';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset' | 'set-pin'
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  // Temp state for OAuth user before PIN is set
  const [oauthUser, setOauthUser] = useState(null);
  const [oauthToken, setOauthToken] = useState(null);
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
      login(data.user, data.token);
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
      login(data.user, data.token);
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

  // ─── OAuth handlers ───

  const handleOAuthResult = (data) => {
    if (data.needs_pin) {
      // Store user + token temporarily, show PIN setup
      setOauthUser(data.user);
      setOauthToken(data.token);
      setAuthToken(data.token); // Set so set-pin API call works
      setPin('');
      setError('');
      setMode('set-pin');
    } else {
      login(data.user, data.token);
      navigate('/');
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      let idToken;
      if (window.Capacitor?.isNativePlatform()) {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const result = await SignInWithApple.authorize({
          clientId: 'com.strengthcharts.app',
          redirectURI: 'https://strength-charts.vercel.app',
          scopes: 'email name',
          state: String(Date.now()),
        });
        idToken = result.response?.identityToken;
        if (!idToken) throw new Error('No identity token received from Apple');
      } else {
        setError('Apple Sign In is only available on iOS');
        setLoading(false);
        return;
      }

      const data = await api.oauthApple(idToken);
      handleOAuthResult(data);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('cancel') || msg.includes('1001')) {
        // User cancelled — do nothing
      } else if (msg.includes('1000')) {
        setError('Enable "Sign in with Apple" in Xcode → Signing & Capabilities');
      } else {
        setError(msg || 'Apple sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      let idToken;
      if (window.Capacitor?.isNativePlatform()) {
        const { GoogleAuth } = await import('@southdevs/capacitor-google-auth');
        await GoogleAuth.initialize();
        const result = await GoogleAuth.signIn();
        idToken = result.authentication?.idToken;
        if (!idToken) throw new Error('No ID token received from Google');
      } else {
        setError('Google Sign In is only available on mobile');
        setLoading(false);
        return;
      }

      const data = await api.oauthGoogle(idToken);
      handleOAuthResult(data);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('cancel') || msg.includes('dismissed')) {
        // User cancelled — do nothing
      } else if (msg.includes('scope') || msg.includes('client')) {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async (e) => {
    e.preventDefault();
    setError('');
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    setLoading(true);
    try {
      const data = await api.oauthSetPin(pin);
      login(data.user || oauthUser, oauthToken);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── OAuth Buttons Component ───
  const OAuthButtons = () => (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-dark-600" />
        <span className="text-gray-500 text-xs uppercase font-display font-bold">or continue with</span>
        <div className="flex-1 h-px bg-dark-600" />
      </div>
      <div className="space-y-3">
        <button
          onClick={handleAppleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-black font-display font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition-transform"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.62-2.2.44-3.06-.4C4.24 16.7 4.89 10.64 8.7 10.4c1.23.07 2.08.72 2.8.78.98-.2 1.93-.78 2.98-.7 1.27.1 2.22.6 2.84 1.54-2.6 1.56-1.98 4.97.37 5.92-.47 1.23-.68 1.72-1.64 2.34zM12.05 10.36c-.15-2.2 1.65-4.1 3.7-4.36.3 2.55-2.3 4.47-3.7 4.36z"/>
          </svg>
          Sign in with Apple
        </button>
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-dark-700 border border-dark-500 text-white font-display font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition-transform"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );

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

            <OAuthButtons />
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

            <OAuthButtons />
          </>
        )}

        {/* Set PIN after OAuth */}
        {mode === 'set-pin' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <h2 className="font-display font-bold text-xl text-white uppercase">Set Your PIN</h2>
              <p className="text-gray-500 text-sm mt-1">
                Create a 6-digit PIN for quick sign-in
              </p>
            </div>
            <form onSubmit={handleSetPin} className="space-y-4">
              <input
                type="tel"
                placeholder="6-Digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center tracking-[0.5em] text-2xl font-display"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                required
              />
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading || pin.length !== 6}>
                {loading ? '...' : 'Set PIN & Continue'}
              </button>
            </form>
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
