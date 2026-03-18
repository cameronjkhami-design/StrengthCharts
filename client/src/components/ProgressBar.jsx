import { PRIMARY_COLOR } from '../utils/colors';

export default function ProgressBar({ progress, color = PRIMARY_COLOR, label, sublabel }) {
  return (
    <div className="w-full">
      {(label || sublabel) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-gray-400">{label}</span>}
          {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
        </div>
      )}
      <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, progress)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
