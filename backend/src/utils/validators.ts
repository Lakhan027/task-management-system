// src/utils/validators.ts
import type { CreateTaskRequest, TaskStatus, TaskPriority, UpdateTaskRequest } from '../types/task.js';
import type { AddMemberRequest, CreateProjectRequest, MemberRole, ProjectStatus, ProjectVisibility, UpdateProjectRequest } from '../types/project.js';

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

interface RegisterData {
  name?: string;
  email?: string;
  password?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate registration data
 */
export const validateRegister = (data: RegisterData): ValidationResult => {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || !isStrongPassword(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase and number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

interface LoginData {
  email?: string;
  password?: string;
}

/**
 * Validate login data
 */
export const validateLogin = (data: LoginData): ValidationResult => {
  const errors: string[] = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || data.password.length < 1) {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validTaskStatuses: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
const validTaskPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const validProjectStatuses: ProjectStatus[] = ['active', 'archived', 'completed'];
const validProjectVisibilities: ProjectVisibility[] = ['public', 'private', 'team'];
const validMemberRoles: MemberRole[] = ['admin', 'member', 'viewer'];

export const validateTaskCreate = (data: Partial<CreateTaskRequest> | unknown): ValidationResult => {
  const errors: string[] = [];
  const payload = data as Partial<CreateTaskRequest> | undefined;

  if (!payload?.title || String(payload.title).trim().length < 2) {
    errors.push('Task title must be at least 2 characters');
  }

  if (payload?.assignedTo === undefined || Number.isNaN(Number(payload.assignedTo)) || Number(payload.assignedTo) <= 0) {
    errors.push('Task must be assigned to a valid user');
  }

  if (payload?.status && !validTaskStatuses.includes(payload.status)) {
    errors.push('Invalid task status');
  }

  if (payload?.priority && !validTaskPriorities.includes(payload.priority)) {
    errors.push('Invalid task priority');
  }

  if (payload?.dueDate) {
    const parsed = Date.parse(String(payload.dueDate));
    if (Number.isNaN(parsed)) {
      errors.push('Due date must be a valid date');
    }
  }

  if (payload?.estimatedHours !== undefined && (Number.isNaN(Number(payload.estimatedHours)) || Number(payload.estimatedHours) < 0)) {
    errors.push('Estimated hours must be a non-negative number');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateTaskUpdate = (data: Partial<UpdateTaskRequest> | unknown): ValidationResult => {
  const errors: string[] = [];
  const payload = data as Partial<UpdateTaskRequest> | undefined;

  if (payload?.title !== undefined && String(payload.title).trim().length < 2) {
    errors.push('Task title must be at least 2 characters');
  }

  if (payload?.assignedTo !== undefined && (Number.isNaN(Number(payload.assignedTo)) || Number(payload.assignedTo) <= 0)) {
    errors.push('Assigned user must be a valid user id');
  }

  if (payload?.status && !validTaskStatuses.includes(payload.status)) {
    errors.push('Invalid task status');
  }

  if (payload?.priority && !validTaskPriorities.includes(payload.priority)) {
    errors.push('Invalid task priority');
  }

  if (payload?.dueDate) {
    const parsed = Date.parse(String(payload.dueDate));
    if (Number.isNaN(parsed)) {
      errors.push('Due date must be a valid date');
    }
  }

  if (payload?.estimatedHours !== undefined && (Number.isNaN(Number(payload.estimatedHours)) || Number(payload.estimatedHours) < 0)) {
    errors.push('Estimated hours must be a non-negative number');
  }

  if (payload?.actualHours !== undefined && (Number.isNaN(Number(payload.actualHours)) || Number(payload.actualHours) < 0)) {
    errors.push('Actual hours must be a non-negative number');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateTaskStatus = (data: { status?: string } | unknown): ValidationResult => {
  const errors: string[] = [];
  const payload = data as { status?: string } | undefined;

  if (!payload?.status || !validTaskStatuses.includes(payload.status as TaskStatus)) {
    errors.push('Status must be one of todo, in-progress, review, done');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateTaskComment = (data: { text?: string } | unknown): ValidationResult => {
  const errors: string[] = [];
  const payload = data as { text?: string } | undefined;

  if (!payload?.text || String(payload.text).trim().length < 1) {
    errors.push('Comment text is required');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateProjectCreate = (data: Partial<CreateProjectRequest> | unknown): ValidationResult => {
  const errors: string[] = [];
  const payload = data as Partial<CreateProjectRequest> | undefined;

  if (!payload?.name || String(payload.name).trim().length < 2) {
    errors.push('Project name must be at least 2 characters');
  }

  if (payload?.status && !validProjectStatuses.includes(payload.status)) {
    errors.push('Invalid project status');
  }

  if (payload?.visibility && !validProjectVisibilities.includes(payload.visibility)) {
    errors.push('Invalid project visibility');
  }

  if (payload?.startDate) {
    const parsed = Date.parse(String(payload.startDate));
    if (Number.isNaN(parsed)) {
      errors.push('Start date must be a valid date');
    }
  }

  if (payload?.endDate) {
    const parsed = Date.parse(String(payload.endDate));
    if (Number.isNaN(parsed)) {
      errors.push('End date must be a valid date');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const validateProjectUpdate = (data: Partial<UpdateProjectRequest> | unknown): ValidationResult => {
  const errors: string[] = [];
  const payload = data as Partial<UpdateProjectRequest> | undefined;

  if (payload?.name !== undefined && String(payload.name).trim().length < 2) {
    errors.push('Project name must be at least 2 characters');
  }

  if (payload?.status && !validProjectStatuses.includes(payload.status)) {
    errors.push('Invalid project status');
  }

  if (payload?.visibility && !validProjectVisibilities.includes(payload.visibility)) {
    errors.push('Invalid project visibility');
  }

  if (payload?.startDate) {
    const parsed = Date.parse(String(payload.startDate));
    if (Number.isNaN(parsed)) {
      errors.push('Start date must be a valid date');
    }
  }

  if (payload?.endDate) {
    const parsed = Date.parse(String(payload.endDate));
    if (Number.isNaN(parsed)) {
      errors.push('End date must be a valid date');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const validateProjectMember = (data: Partial<AddMemberRequest> | unknown): ValidationResult => {
  const errors: string[] = [];
  const payload = data as Partial<AddMemberRequest> | undefined;

  if (payload?.memberUserId === undefined || Number.isNaN(Number(payload.memberUserId)) || Number(payload.memberUserId) <= 0) {
    errors.push('Member user id must be a valid positive number');
  }

  if (payload?.role && !validMemberRoles.includes(payload.role)) {
    errors.push('Invalid member role');
  }

  return { isValid: errors.length === 0, errors };
};
