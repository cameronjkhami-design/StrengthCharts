import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDateShort, kgToDisplay } from '../utils/conversions';
import { calcE1RM } from '../utils/benchmarks';
import { PRIMARY_COLOR } from '../utils/colors';

export default function LiftChart({ logs, unit = 'lbs', showE1RM = true }) {
  if (!logs || logs.length === 0) return null;

  const data = [...logs]
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
    .map(log => ({
      date: formatDateShort(log.logged_at),
      weight: kgToDisplay(log.weight_kg, unit),
      e1rm: kgToDisplay(calcE1RM(log.weight_kg, log.reps), unit),
      reps: log.reps,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-xs">
        <p className="text-white font-semibold">{d.date}</p>
        <p className="text-gray-300">Weight: {d.weight} {unit}</p>
        <p className="text-gray-300">Reps: {d.reps}</p>
        {showE1RM && <p className="text-primary">Est. 1RM: {d.e1rm} {unit}</p>}
      </div>
    );
  };

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
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
          />
          <Tooltip content={<CustomTooltip />} />
          {showE1RM && (
            <Line
              type="monotone"
              dataKey="e1rm"
              stroke={PRIMARY_COLOR}
              strokeWidth={2}
              dot={{ fill: PRIMARY_COLOR, r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#6b7280"
            strokeWidth={1.5}
            dot={{ fill: '#6b7280', r: 2 }}
            strokeDasharray={showE1RM ? "4 4" : "0"}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
