import TaskForm from '@/components/tasks/TaskForm';

export default function NewTaskPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <TaskForm />
      </div>
    </div>
  );
}