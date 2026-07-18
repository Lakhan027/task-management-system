'use client';

import { ReactNode } from 'react';

interface StatCard {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
}

interface DashboardStatsProps {
  stats: StatCard[];
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
            <div className={`${stat.color} p-3 rounded-xl text-white`}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
