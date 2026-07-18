'use client';

import { Project } from '@/types/project';
import ProjectCard from './ProjectCard';
import { FolderKanban } from 'lucide-react';
import Link from 'next/link';

interface ProjectListProps {
  projects: Project[];
  onDelete: (id: string) => void;
}

export default function ProjectList({ projects, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
        <FolderKanban className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
        <p className="text-gray-500 mt-1">Get started by creating your first project</p>
        <Link
          href="/dashboard/projects/new"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Project
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project._id} project={project} onDelete={onDelete} />
      ))}
    </div>
  );
}
