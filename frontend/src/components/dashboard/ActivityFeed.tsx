'use client';

import { DashboardLog } from '@/types/dashboard';
import { Activity } from 'lucide-react';

interface ActivityFeedProps {
  logs: DashboardLog[];
}

const actionLabels: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  status_change: 'changed status of',
  comment: 'commented on',
};

export default function ActivityFeed({ logs }: ActivityFeedProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {logs.map((log) => (
          <div key={`${log.userId}-${log.timestamp}-${log.resourceId}`} className="flex items-start gap-3 p-2">
            <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                <span className="font-medium">User #{log.userId}</span>{' '}
                {actionLabels[log.action] || log.action}{' '}
                <span className="font-medium">{log.resourceType}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
