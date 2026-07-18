'use client';

import Link from 'next/link';
import { Task } from '@/types/task';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';

interface TaskTableProps {
  tasks: Task[];
  onDelete: (id: string) => void;
}

export default function TaskTable({ tasks, onDelete }: TaskTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Priority</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Assigned To</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Due Date</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {tasks.map((task) => (
            <tr key={task._id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/tasks/${task._id}`}
                  className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
                >
                  {task.title}
                </Link>
                {task.description && (
                  <p className="text-sm text-gray-500 truncate max-w-xs">{task.description}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <TaskStatusBadge status={task.status} />
              </td>
              <td className="px-4 py-3">
                <TaskPriorityBadge priority={task.priority} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                User #{task.assignedTo}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/tasks/${task._id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View
                  </Link>
                  <Link
                    href={`/dashboard/tasks/${task._id}/edit`}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => onDelete(task._id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
