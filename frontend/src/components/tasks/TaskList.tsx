'use client';

import Link from 'next/link';
import { Task } from '@/types/task';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';
import { Trash2 } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onDelete: (id: string) => void;
}

export default function TaskList({ tasks, onDelete }: TaskListProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task._id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <Link
                href={`/dashboard/tasks/${task._id}`}
                className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
              >
                {task.title}
              </Link>
              {task.description && (
                <p className="text-sm text-gray-500 truncate mt-1">{task.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
                {task.tags?.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => onDelete(task._id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
