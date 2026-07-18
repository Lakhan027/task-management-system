'use client';

interface TaskStatusBadgeProps {
  status: 'todo' | 'in-progress' | 'review' | 'done';
}

const statusConfig = {
  todo: { label: 'To Do', className: 'bg-gray-100 text-gray-700' },
  'in-progress': { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  review: { label: 'Review', className: 'bg-yellow-100 text-yellow-700' },
  done: { label: 'Done', className: 'bg-green-100 text-green-700' },
};

export default function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.todo;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}