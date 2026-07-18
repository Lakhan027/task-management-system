// src/types/task.ts
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Subtask {
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface Comment {
  userId: number;
  text: string;
  createdAt: string;
}

export interface Attachment {
  filename: string;
  url: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: number;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  projectId?: string;
  assignedTo: number;
  createdBy: number;
  tags: string[];
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[];
  estimatedHours: number;
  actualHours: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  projectId?: string;
  assignedTo: number;
  tags?: string[];
  subtasks?: { title: string }[];
  estimatedHours?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  projectId?: string;
  assignedTo?: number;
  tags?: string[];
  subtasks?: Subtask[];
  estimatedHours?: number;
  actualHours?: number;
  metadata?: Record<string, unknown>;
}

// ✅ Add this missing type
export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string | string[];
  projectId?: string;
  dueDateBefore?: string;
  dueDateAfter?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TaskStats {
  total: number;
  stats: Record<TaskStatus, number>;
}
