'use client';

interface ProjectStatusBadgeProps {
  status: 'active' | 'archived' | 'completed';
}

const statusConfig = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
};

export default function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.active;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}