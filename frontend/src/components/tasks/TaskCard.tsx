'use client';

import Link from 'next/link';
import { Task } from '@/types/task';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';
import { Calendar } from 'lucide-react';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/dashboard/tasks/${task._id}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 truncate flex-1">{task.title}</h3>
        </div>
        {task.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>User #{task.assignedTo}</span>
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
