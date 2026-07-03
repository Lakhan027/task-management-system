import { Document } from 'mongoose';

// ──────────────────────────────────────────────
// Activity Log Type Definitions
// ──────────────────────────────────────────────

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'comment'
  | 'status_change'
  | 'complete';

export type ActivityResourceType = 'task' | 'project' | 'comment' | 'subtask';

export interface IActivityLogBase {
  userId: number;              // User.id from PostgreSQL
  action: ActivityAction;
  resourceType: ActivityResourceType;
  resourceId: string;          // MongoDB ObjectId
  changes: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface IActivityLog extends Document, IActivityLogBase {}

// ──────────────────────────────────────────────
// Request/Response Types
// ──────────────────────────────────────────────

export interface ActivityLogFilters {
  userId?: number;
  action?: ActivityAction;
  resourceType?: ActivityResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface ActivityLogStats {
  total: number;
  byAction: Record<ActivityAction, number>;
  byResource: Record<ActivityResourceType, number>;
  last24Hours: number;
  last7Days: number;
}