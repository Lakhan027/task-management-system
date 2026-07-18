'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusChartProps {
  stats: Record<string, number>;
}

const COLORS = ['#6B7280', '#3B82F6', '#EAB308', '#22C55E'];
const LABELS: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
};

export default function StatusChart({ stats }: StatusChartProps) {
  const data = Object.entries(stats || {}).map(([key, value]) => ({
    name: LABELS[key] || key,
    value,
  }));

  if (data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No task data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
