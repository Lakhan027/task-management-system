'use client';

import Link from 'next/link';
import { Project } from '@/types/project';
import ProjectStatusBadge from './ProjectStatusBadge';
import { Users, Calendar, MoreVertical } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <Link href={`/dashboard/projects/${project._id}`} className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
        </Link>
        <div className="relative group">
          <button className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <MoreVertical className="w-4 h-4" />
          </button>
          <div className="absolute right-0 top-8 hidden group-hover:block bg-white shadow-lg rounded-lg border border-gray-200 py-1 min-w-[120px] z-10">
            <Link
              href={`/dashboard/projects/${project._id}/edit`}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
            <button
              onClick={() => onDelete(project._id)}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {project.description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{project.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ProjectStatusBadge status={project.status} />
        <span className="text-sm text-gray-500 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {project.members?.length || 0} members
        </span>
        {project.endDate && (
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Due {new Date(project.endDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </span>
        <Link
          href={`/dashboard/projects/${project._id}`}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
