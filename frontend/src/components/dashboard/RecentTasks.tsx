'use client';

import Link from 'next/link';
import { DashboardTask } from '@/types/dashboard';
import { ListTodo } from 'lucide-react';

interface RecentTasksProps {
  tasks: DashboardTask[];
}

export default function RecentTasks({ tasks }: RecentTasksProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
        <div className="text-center py-8">
          <ListTodo className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No tasks yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
      <div className="space-y-3">
        {tasks.slice(0, 5).map((task) => (
          <Link
            key={task._id}
            href={`/dashboard/tasks/${task._id}`}
            className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 text-sm">{task.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                task.status === 'done' ? 'bg-green-100 text-green-700' :
                task.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {task.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
