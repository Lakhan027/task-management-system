'use client';

import Link from 'next/link';
import { DashboardProject } from '@/types/dashboard';
import { FolderKanban } from 'lucide-react';

interface RecentProjectsProps {
  projects: DashboardProject[];
}

export default function RecentProjects({ projects }: RecentProjectsProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
        <div className="text-center py-8">
          <FolderKanban className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No projects yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
      <div className="space-y-3">
        {projects.slice(0, 5).map((project) => (
          <Link
            key={project._id}
            href={`/dashboard/projects/${project._id}`}
            className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 text-sm">{project.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                project.status === 'active' ? 'bg-green-100 text-green-700' :
                project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {project.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
