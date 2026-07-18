export interface DashboardUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface DashboardTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo: number;
  createdBy: number;
  createdAt: string;
}

export interface DashboardProject {
  _id: string;
  name: string;
  status: string;
  ownerId: number;
  createdAt: string;
}

export interface DashboardLog {
  userId: number;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
}

export interface DashboardData {
  postgresql: {
    connected: boolean;
    userCount: number;
    recentUsers: DashboardUser[];
  };
  mongodb: {
    connected: boolean;
    taskCount: number;
    projectCount: number;
    logCount: number;
    recentTasks: DashboardTask[];
    recentProjects: DashboardProject[];
    recentLogs: DashboardLog[];
    tasksByStatus?: Record<string, number>;
    tasksByPriority?: Record<string, number>;
  };
  redis: {
    connected: boolean;
    totalKeys: number;
    userKeyCount?: number;
    keySamples: {
      key: string;
      type: string;
      ttl: number;
      value: unknown;
    }[];
  };
  user: {
    id: number;
    role: string;
  };
  timestamp: string;
}
