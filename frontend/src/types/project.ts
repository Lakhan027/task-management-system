export type ProjectStatus = 'active' | 'archived' | 'completed';
export type ProjectVisibility = 'public' | 'private' | 'team';
export type MemberRole = 'admin' | 'member' | 'viewer';

export interface ProjectMember {
  userId: number;
  role: MemberRole;
  joinedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  ownerId: number;
  members: ProjectMember[];
  status: ProjectStatus;
  visibility: ProjectVisibility;
  startDate?: string;
  endDate?: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface AddMemberRequest {
  memberUserId: number;
  role?: MemberRole;
}
