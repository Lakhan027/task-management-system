'use client';

import { useGetDashboardQuery } from '@/services/dashboardApi';
import {
  Database,
  Server,
  HardDrive,
  Activity,
  Clock,
  Key,
  Users,
  ListTodo,
  FolderKanban,
  FileText,
  RefreshCw,
} from 'lucide-react';

export default function LearningPage() {
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
        <p className="text-red-500">Failed to load database explorer data.</p>
        <button onClick={refetch} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  const { postgresql, mongodb, redis, timestamp } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Explorer</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Live data from all three databases — updated at {new Date(timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== PostgreSQL Panel ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-5 py-4 flex items-center gap-3">
            <Server className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-white font-semibold">PostgreSQL</h2>
              <p className="text-blue-200 text-xs">Relational — Users</p>
            </div>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${postgresql.connected ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
              {postgresql.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>Total users: <strong className="text-gray-900">{postgresql.userCount}</strong></span>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Users</h3>
              <div className="space-y-2">
                {postgresql.recentUsers.map((user) => (
                  <div key={user.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{user.name}</span>
                      <span className="text-xs text-gray-400">ID: {user.id}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">{user.email}</div>
                    <div className="text-gray-400 text-xs mt-0.5">
                      Role: {user.role} &middot; Joined {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <CodeBlock label="SQL Schema" code={`model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  role      String   @default("user")
  createdAt DateTime @default(now())
}`} />
            </div>
          </div>
        </div>

        {/* ===== MongoDB Panel ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-green-600 px-5 py-4 flex items-center gap-3">
            <Database className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-white font-semibold">MongoDB</h2>
              <p className="text-green-200 text-xs">Document — Tasks, Projects, Logs</p>
            </div>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${mongodb.connected ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
              {mongodb.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-gray-50 rounded-lg p-2">
                <ListTodo className="w-4 h-4 mx-auto text-gray-500" />
                <div className="font-bold text-gray-900 mt-1">{mongodb.taskCount}</div>
                <div className="text-gray-400 text-xs">Tasks</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <FolderKanban className="w-4 h-4 mx-auto text-gray-500" />
                <div className="font-bold text-gray-900 mt-1">{mongodb.projectCount}</div>
                <div className="text-gray-400 text-xs">Projects</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <Activity className="w-4 h-4 mx-auto text-gray-500" />
                <div className="font-bold text-gray-900 mt-1">{mongodb.logCount}</div>
                <div className="text-gray-400 text-xs">Logs</div>
              </div>
            </div>

            {mongodb.tasksByStatus && Object.keys(mongodb.tasksByStatus).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tasks by Status</h3>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(mongodb.tasksByStatus).map(([status, count]) => (
                    <div key={status} className="bg-gray-50 rounded px-2 py-1 flex justify-between">
                      <span className="capitalize text-gray-600">{status}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mongodb.tasksByPriority && Object.keys(mongodb.tasksByPriority).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tasks by Priority</h3>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(mongodb.tasksByPriority).map(([priority, count]) => (
                    <div key={priority} className="bg-gray-50 rounded px-2 py-1 flex justify-between">
                      <span className="capitalize text-gray-600">{priority}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Tasks</h3>
              <div className="space-y-1.5">
                {mongodb.recentTasks.slice(0, 4).map((task) => (
                  <div key={task._id} className="bg-gray-50 rounded-lg p-2.5 text-xs">
                    <div className="font-medium text-gray-900 truncate">{task.title}</div>
                    <div className="text-gray-400 mt-0.5">
                      {task.status} &middot; {task.priority}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Activity Logs</h3>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {mongodb.recentLogs.slice(0, 5).map((log, i) => (
                  <div key={`${log.userId}-${log.timestamp}-${i}`} className="flex items-start gap-2 text-xs bg-gray-50 rounded-lg p-2">
                    <Activity className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                    <div>
                      <span className="text-gray-700">{log.action}</span>{' '}
                      <span className="text-gray-500">{log.resourceType}</span>
                      <span className="text-gray-400 ml-1">#{log.resourceId}</span>
                      <div className="text-gray-400">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <CodeBlock label="MongoDB Schema (Task)" code={`{
  title:       String  (required)
  description: String
  status:      "todo" | "in-progress" | "review" | "done"
  priority:    "low" | "medium" | "high" | "urgent"
  assignedTo:  Number  (ref: User.id)
  createdBy:   Number  (ref: User.id)
  dueDate:     Date
  tags:        String[]
  comments:    [{ userId, text, createdAt }]
  projectId:   ObjectId (ref: Project)
}`} />
            </div>
          </div>
        </div>

        {/* ===== Redis Panel ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-white font-semibold">Redis</h2>
              <p className="text-red-200 text-xs">In-Memory — Cache, Rate Limits, Blacklist</p>
            </div>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${redis.connected ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
              {redis.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Key className="w-4 h-4" />
              <span>Total keys: <strong className="text-gray-900">{redis.totalKeys}</strong></span>
              {redis.userKeyCount !== undefined && (
                <span className="ml-2 text-gray-400">
                  (relevant to you: <strong>{redis.userKeyCount}</strong>)
                </span>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Redis Keys for You
              </h3>
              <div className="space-y-2">
                {redis.keySamples.length === 0 ? (
                  <p className="text-sm text-gray-400">No Redis keys found for your user.</p>
                ) : (
                  redis.keySamples.map((sample, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 font-medium break-all">{sample.key}</span>
                        <span className={`ml-2 flex-shrink-0 px-1.5 py-0.5 rounded text-xs ${
                          sample.type === 'string' ? 'bg-green-100 text-green-700' :
                          sample.type === 'none' ? 'bg-gray-100 text-gray-500' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {sample.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>TTL: {sample.ttl === -1 ? 'no expiry' : `${sample.ttl}s`}</span>
                      </div>
                      {sample.value != null && (
                        <details className="mt-1">
                          <summary className="text-gray-500 cursor-pointer hover:text-gray-700">View value</summary>
                          <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                            {typeof sample.value === 'object' ? JSON.stringify(sample.value, null, 2) : String(sample.value)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <CodeBlock label="Redis Key Patterns" code={`# Cache
tasks:list:user:{id}:role:{role}:{url}
tasks:detail:user:{id}:role:{role}:{url}
tasks:stats:user:{id}:role:{role}:{url}
project:list:user:{id}:{url}
project:detail:user:{id}:{url}

# Rate Limiting
rate_limit:{userId}:{path}

# Auth
blacklist:{jwt_token}
user:{id}:profile
session:{id}:*`} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
        Data fetched at {new Date(timestamp).toLocaleString()} &middot; User #{data.user.id} ({data.user.role})
      </div>
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <details>
      <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
        {label}
      </summary>
      <pre className="mt-2 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono">{code}</pre>
    </details>
  );
}
