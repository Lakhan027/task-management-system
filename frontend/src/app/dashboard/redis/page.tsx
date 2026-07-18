'use client';

import { useGetDashboardQuery } from '@/services/dashboardApi';
import { HardDrive, RefreshCw, Clock, Key, Trash2, Plus, Eye } from 'lucide-react';

const CATEGORIES = [
  {
    prefix: 'user:',
    label: 'User Profile (Auth Cache)',
    color: 'border-blue-400 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    icon: <Eye className="w-4 h-4 text-blue-600" />,
    createdBy: 'authService.ts:114 — on login',
    deletedBy: 'authService.ts:152 — on logout',
    ttl: '3600s (1 hour)',
  },
  {
    prefix: 'rate_limit:',
    label: 'Rate Limit Counters',
    color: 'border-orange-400 bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    icon: <Clock className="w-4 h-4 text-orange-600" />,
    createdBy: 'rateLimit.ts — on any API call',
    deletedBy: 'Auto-expires after 60s',
    ttl: '60s',
  },
  {
    prefix: 'tasks:',
    label: 'Task Cache',
    color: 'border-green-400 bg-green-50',
    badge: 'bg-green-100 text-green-700',
    icon: <Key className="w-4 h-4 text-green-600" />,
    createdBy: 'cache.ts middleware — on GET /api/tasks',
    deletedBy: 'taskService.ts:43-45 — on create/update/delete task',
    ttl: '3600s (1 hour)',
  },
  {
    prefix: 'project:',
    label: 'Project Cache',
    color: 'border-teal-400 bg-teal-50',
    badge: 'bg-teal-100 text-teal-700',
    icon: <Key className="w-4 h-4 text-teal-600" />,
    createdBy: 'cache.ts middleware — on GET /api/projects',
    deletedBy: 'projectService.ts — on create/update/delete project',
    ttl: '3600s (1 hour)',
  },
  {
    prefix: 'blacklist:',
    label: 'Blacklisted Tokens',
    color: 'border-red-400 bg-red-50',
    badge: 'bg-red-100 text-red-700',
    icon: <Trash2 className="w-4 h-4 text-red-600" />,
    createdBy: 'authService.ts:149 — on logout',
    deletedBy: 'Auto-expires when JWT expires',
    ttl: 'Same as JWT expiry',
  },
  {
    prefix: 'session:',
    label: 'Session Data',
    color: 'border-purple-400 bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
    icon: <Key className="w-4 h-4 text-purple-600" />,
    createdBy: 'authService.ts — on login',
    deletedBy: 'authService.ts:152 — on logout',
    ttl: '86400s (24 hours)',
  },
];

function getCategory(key: string) {
  return CATEGORIES.find((c) => key.startsWith(c.prefix)) || {
    label: 'Other',
    color: 'border-gray-300 bg-gray-50',
    badge: 'bg-gray-100 text-gray-600',
    icon: <Key className="w-4 h-4 text-gray-500" />,
    createdBy: 'Unknown',
    deletedBy: 'Unknown',
    ttl: 'Unknown',
  };
}

export default function RedisInspector() {
  const { data, isLoading, isError, refetch } = useGetDashboardQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load Redis data.</p>
        <button onClick={refetch} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  const { redis, user, timestamp } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <HardDrive className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Redis Inspector</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Live Redis state —{' '}
              <span className={redis.connected ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {redis.connected ? 'Connected' : 'Disconnected'}
              </span>
              {' · '}
              {redis.totalKeys} total key{redis.totalKeys !== 1 ? 's' : ''}
              {redis.userKeyCount !== undefined && ` · ${redis.userKeyCount} relevant to you`}
              {' · '}User #{user.id} ({user.role})
            </p>
          </div>
        </div>
        <button onClick={refetch} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Legend / Lifecycle */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">How Redis Keys Are Created & Deleted</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.prefix} className={`rounded-lg border-l-4 p-3 ${cat.color}`}>
              <div className="flex items-center gap-2 mb-1.5">
                {cat.icon}
                <span className="text-xs font-semibold text-gray-700">{cat.label}</span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5 ml-6">
                <div className="flex items-start gap-1.5">
                  <Plus className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                  <span><strong>Created:</strong> {cat.createdBy}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Trash2 className="w-3 h-3 mt-0.5 text-red-500 flex-shrink-0" />
                  <span><strong>Deleted:</strong> {cat.deletedBy}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Clock className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                  <span><strong>TTL:</strong> {cat.ttl}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key listing */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">All Redis Keys</h2>
          {redis.keySamples.length === 0 && <span className="text-xs text-gray-400">No keys found</span>}
        </div>

        {redis.keySamples.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No Redis keys found. Perform some actions in the app to see them appear.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {redis.keySamples.map((sample, i) => {
              const cat = getCategory(sample.key);
              const ttlPercent = sample.ttl === -1 ? 100 : Math.min(100, (sample.ttl / 3600) * 100);
              const ttlColor = sample.ttl === -1 ? 'bg-gray-300' :
                sample.ttl > 1800 ? 'bg-green-400' :
                sample.ttl > 300 ? 'bg-yellow-400' : 'bg-red-400';

              return (
                <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {cat.icon}
                        <span className="font-mono text-sm text-gray-900 break-all">{sample.key}</span>
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${cat.badge}`}>
                          {sample.type}
                        </span>
                      </div>

                      {/* TTL Bar */}
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${ttlColor}`}
                            style={{ width: `${ttlPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0 w-20 text-right">
                          {sample.ttl === -1 ? 'no expiry' : `${sample.ttl}s remaining`}
                        </span>
                      </div>

                      {/* Value */}
                      {sample.value != null && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                            View value
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto whitespace-pre-wrap border border-gray-200 max-h-48 overflow-y-auto">
                            {typeof sample.value === 'object' ? JSON.stringify(sample.value, null, 2) : String(sample.value)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-400 py-2">
        Data fetched at {new Date(timestamp).toLocaleString()}
      </div>
    </div>
  );
}
