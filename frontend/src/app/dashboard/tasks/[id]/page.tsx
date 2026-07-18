'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  useGetTaskQuery,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} from '@/services/taskApi';
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge';
import TaskPriorityBadge from '@/components/tasks/TaskPriorityBadge';
import TaskComments from '@/components/tasks/TaskComments';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [status, setStatus] = useState('');

  const { data: task, isLoading } = useGetTaskQuery(id);
  const [updateStatus] = useUpdateTaskStatusMutation();
  const [deleteTask] = useDeleteTaskMutation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Task not found</h2>
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id);
      router.push('/dashboard/tasks');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/tasks"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tasks
      </Link>

      {/* Task Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
              {task.tags?.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/tasks/${id}/edit`}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </Link>
            <button
              onClick={handleDelete}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {task.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Assigned To:</span>
            <span className="ml-2 text-gray-900 font-medium">User #{task.assignedTo}</span>
          </div>
          {task.dueDate && (
            <div>
              <span className="text-gray-500">Due Date:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-2 text-gray-900 font-medium">
              {new Date(task.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
          <select
            value={status || task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      <TaskComments taskId={id} comments={task.comments || []} />
    </div>
  );
}