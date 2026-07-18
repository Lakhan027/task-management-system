'use client';

interface TaskPriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const priorityConfig = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-600' },
};

export default function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}