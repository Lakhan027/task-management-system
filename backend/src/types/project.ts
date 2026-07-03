import { Document } from 'mongoose';

export type ProjectStatus = 'active' | 'archived' | 'completed';
export type ProjectVisibility = 'public' | 'private' | 'team';
export type MemberRole = 'admin' | 'member' | 'viewer';

export interface IProject extends Document {
  name: string;
  description?: string;
  ownerId: number;
  members: {
    userId: number;
    role: MemberRole;
    joinedAt: Date;
  }[];
  status: ProjectStatus;
  visibility: ProjectVisibility;
  startDate?: Date;
  endDate?: Date;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface AddMemberRequest {
  memberUserId: number;
  role?: MemberRole;
}

export interface RemoveMemberRequest {
  memberUserId: number;
}
