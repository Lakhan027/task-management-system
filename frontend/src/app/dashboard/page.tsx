'use client';

import { useGetDashboardQuery } from '@/services/dashboardApi';
import { Users, ListTodo, FolderKanban, Activity, Database } from 'lucide-react';

export default function DashboardPage() {
  const { data: dashboard, isLoading: dashboardLoading, isError } = useGetDashboardQuery();

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load dashboard data. Please try again later.</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Tasks',
      value: dashboard?.mongodb?.taskCount || 0,
      icon: ListTodo,
      color: 'bg-blue-500',
    },
    {
      title: 'Projects',
      value: dashboard?.mongodb?.projectCount || 0,
      icon: FolderKanban,
      color: 'bg-green-500',
    },
    {
      title: 'Users',
      value: dashboard?.postgresql?.userCount || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Activity Logs',
      value: dashboard?.mongodb?.logCount || 0,
      icon: Activity,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening with your tasks.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <Database className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">PostgreSQL</p>
              <p className="text-sm font-medium text-green-700">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <Database className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">MongoDB</p>
              <p className="text-sm font-medium text-green-700">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <Database className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Redis</p>
              <p className="text-sm font-medium text-green-700">
                {dashboard?.redis?.connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
