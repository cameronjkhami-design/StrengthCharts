import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatDateShort } from '../utils/conversions';
import { calcE1RM } from '../utils/benchmarks';
import { PRIMARY_COLOR } from '../utils/colors';

export default function StrengthRatioChart({ logs, bodyweightKg, unit = 'lbs' }) {
  if (!logs || logs.length === 0 || !bodyweightKg) return null;

  const data = [...logs]
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
    .map(log => {
      const e1rm = calcE1RM(log.weight_kg, log.reps);
      return {
        date: formatDateShort(log.logged_at),
        ratio: Math.round((e1rm / bodyweightKg) * 100) / 100,
      };
    });

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-xs">
        <p className="text-white font-semibold">{payload[0].payload.date}</p>
        <p className="text-primary font-display font-bold">{payload[0].value}x BW</p>
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
          <ReferenceLine y={1} stroke="#3a3a3a" strokeDasharray="4 4" label={{ value: '1x BW', fill: '#6b7280', fontSize: 9 }} />
          <ReferenceLine y={1.5} stroke="#3a3a3a" strokeDasharray="4 4" label={{ value: '1.5x BW', fill: '#6b7280', fontSize: 9 }} />
          <ReferenceLine y={2} stroke="#3a3a3a" strokeDasharray="4 4" label={{ value: '2x BW', fill: '#6b7280', fontSize: 9 }} />
          <Line
            type="monotone"
            dataKey="ratio"
            stroke={PRIMARY_COLOR}
            strokeWidth={2}
            dot={{ fill: PRIMARY_COLOR, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
