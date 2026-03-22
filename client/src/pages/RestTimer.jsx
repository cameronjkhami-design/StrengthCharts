import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';

const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1:00', seconds: 60 },
  { label: '1:30', seconds: 90 },
  { label: '2:00', seconds: 120 },
  { label: '3:00', seconds: 180 },
  { label: '5:00', seconds: 300 },
];

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RestTimer() {
  const { addNotification } = useNotification();
  const [totalTime, setTotalTime] = useState(() => {
    return parseInt(localStorage.getItem('sc_rest_timer') || '90');
  });
  const [remaining, setRemaining] = useState(totalTime);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    setFinished(false);
    setRunning(true);
    const now = Date.now();
    startTimeRef.current = now;
    endTimeRef.current = now + remaining * 1000;

    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        setFinished(true);
        addNotification('Rest timer done! Get back to it!', 'success');
        // Audible alert — play 3 beeps using Web Audio API
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const playBeep = (time) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'square';
            gain.gain.value = 0.3;
            osc.start(ctx.currentTime + time);
            osc.stop(ctx.currentTime + time + 0.15);
          };
          playBeep(0);
          playBeep(0.25);
          playBeep(0.5);
        } catch {}
        // Vibrate
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
        if (window.Capacitor?.isNativePlatform()) {
          import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
            Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 300);
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 600);
          }).catch(() => {});
        }
      }
    }, 100);
  }, [remaining, addNotification]);

  const reset = useCallback(() => {
    stop();
    setRemaining(totalTime);
    setFinished(false);
  }, [totalTime, stop]);

  const selectPreset = (seconds) => {
    stop();
    setTotalTime(seconds);
    setRemaining(seconds);
    setFinished(false);
    localStorage.setItem('sc_rest_timer', String(seconds));
  };

  const adjustTime = (delta) => {
    if (running) return;
    const next = Math.max(5, Math.min(600, remaining + delta));
    setRemaining(next);
    setTotalTime(next);
    localStorage.setItem('sc_rest_timer', String(next));
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const progress = totalTime > 0 ? remaining / totalTime : 0;
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-3xl text-white">Rest Timer</h1>
        <p className="text-gray-500 text-sm mt-1">Set your rest between sets</p>
      </div>

      {/* Timer Circle */}
      <div className="flex justify-center mb-8">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
            {/* Background circle */}
            <circle
              cx="128" cy="128" r="120"
              fill="none"
              stroke="var(--dark-700, #2a2a2a)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="128" cy="128" r="120"
              fill="none"
              stroke={finished ? '#22c55e' : 'var(--color-primary, #FFD700)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-200"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display font-extrabold text-6xl ${finished ? 'text-green-400 animate-pulse' : 'text-white'}`}>
              {formatTime(remaining)}
            </span>
            {finished && (
              <span className="text-green-400 font-display font-bold text-sm uppercase mt-1">Done!</span>
            )}
          </div>
        </div>
      </div>

      {/* +/- Adjust */}
      {!running && (
        <div className="flex justify-center gap-6 mb-6">
          <button
            onClick={() => adjustTime(-5)}
            className="w-14 h-14 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center text-gray-400 text-2xl font-display font-bold active:scale-90 transition-transform"
          >
            −
          </button>
          <button
            onClick={() => adjustTime(5)}
            className="w-14 h-14 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center text-gray-400 text-2xl font-display font-bold active:scale-90 transition-transform"
          >
            +
          </button>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 mb-8">
        {!running ? (
          <button
            onClick={start}
            className="btn-primary flex-1 text-lg py-4"
          >
            {finished || remaining < totalTime ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button
            onClick={stop}
            className="flex-1 py-4 rounded-xl bg-dark-700 border border-dark-500 text-white font-display font-bold text-lg uppercase active:scale-95 transition-transform"
          >
            Pause
          </button>
        )}
        <button
          onClick={reset}
          className="w-16 py-4 rounded-xl bg-dark-700 border border-dark-500 text-gray-400 font-display font-bold text-sm uppercase active:scale-95 transition-transform"
        >
          Reset
        </button>
      </div>

      {/* Presets */}
      <div>
        <p className="text-gray-500 text-xs uppercase font-display font-bold mb-3">Quick Presets</p>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.seconds}
              onClick={() => selectPreset(p.seconds)}
              className={`py-3 rounded-xl font-display font-bold text-sm uppercase transition-all active:scale-95 ${
                totalTime === p.seconds && !running
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-dark-700 text-gray-400 border border-dark-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
