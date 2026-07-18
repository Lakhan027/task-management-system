export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const TASK_STATUSES = ['todo', 'in-progress', 'review', 'done'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const PROJECT_STATUSES = ['active', 'archived', 'completed'] as const;
export const PROJECT_VISIBILITIES = ['public', 'private', 'team'] as const;
export const MEMBER_ROLES = ['admin', 'member', 'viewer'] as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
};

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
  active: 'Active',
  archived: 'Archived',
  completed: 'Completed',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
