'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGetTasksQuery, useDeleteTaskMutation } from '@/services/taskApi';
import { Task, TaskFilters, TaskPriority, TaskStatus } from '@/types/task';
import { Plus, Search, Filter, X, ListTodo } from 'lucide-react'; // ✅ Add ListTodo here
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge';
import TaskPriorityBadge from '@/components/tasks/TaskPriorityBadge';

export default function TasksPage() {
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const queryFilters: TaskFilters = {
    ...(filters.status ? { status: filters.status as TaskStatus } : {}),
    ...(filters.priority ? { priority: filters.priority as TaskPriority } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  const { data, isLoading, isError, error } = useGetTasksQuery(queryFilters);
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id).unwrap();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', priority: '', search: '' });
  };

  const tasks = data?.tasks || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load tasks. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Manage all your tasks in one place</p>
        </div>
       <Link
  href="/dashboard/tasks/new"  // ✅ Fixed
  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
>
  <Plus className="w-4 h-4" />
  New Task
</Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              aria-label="Search tasks"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filters.status || filters.priority) && (
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            )}
          </button>
          {(filters.status || filters.priority || filters.search) && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-3">
              <ListTodo className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No tasks yet</h3>
            <p className="text-gray-500 mt-1">Get started by creating your first task</p>
            <Link
              href="/dashboard/tasks/new"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Task
            </Link>
          </div>
        ) : (
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
                {tasks.map((task: Task) => (
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
                            onClick={() => handleDelete(task._id)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {tasks.length} of {pagination.total} tasks
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
