import { Document,ObjectId  } from 'mongoose';

// ──────────────────────────────────────────────
// Task Type Definitions
// ──────────────────────────────────────────────

export interface Subtask {
  title: string;
  completed: boolean;
  completedAt?: Date;
}

export interface Comment {
  userId: number;
  text: string;
  createdAt: Date;
}

export interface Attachment {
  filename: string;
  url: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: number;
  uploadedAt: Date;
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ITaskBase {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  projectId?: ObjectId | string;
  assignedTo: number;        // User.id from PostgreSQL
  createdBy: number;         // User.id from PostgreSQL
  tags: string[];
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[];
  estimatedHours: number;
  actualHours: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask extends Document, ITaskBase {}


// ──────────────────────────────────────────────
// Request/Response Types (for controllers)
// ──────────────────────────────────────────────
export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  projectId?: string;
  assignedTo: number;
  tags?: string[];
  subtasks?: Omit<Subtask, 'completed' | 'completedAt'>[];
  estimatedHours?: number;
  metadata?: Record<string, any>;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  projectId?: string;
  assignedTo?: number;
  tags?: string[];
  subtasks?: Subtask[];
  estimatedHours?: number;
  actualHours?: number;
  metadata?: Record<string, any>;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string | string[];
  projectId?: string;
  dueDateBefore?: string;
  dueDateAfter?: string;
  page?: number;
  limit?: number;
  search?: string; // Added search field for filtering by title or description
}


export interface TaskStats {
  total: number;
  stats: {
    todo: number;
    'in-progress': number;
    review: number;
    done: number;
  };
}

export interface PaginatedTasksResponse {
  tasks: ITaskBase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}