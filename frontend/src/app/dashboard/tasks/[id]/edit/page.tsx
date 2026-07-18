'use client';

import { useParams } from 'next/navigation';
import { useGetTaskQuery } from '@/services/taskApi';
import TaskForm from '@/components/tasks/TaskForm';

export default function EditTaskPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading } = useGetTaskQuery(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Task not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Task</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <TaskForm task={data} isEditing />
      </div>
    </div>
  );
}
