'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGetProjectsQuery, useDeleteProjectMutation } from '@/services/projectApi';
import { Plus, Search, FolderKanban, Users, Calendar, MoreVertical } from 'lucide-react';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import { Project } from '@/types/project';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error } = useGetProjectsQuery();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const projects = data || [];

  const filteredProjects = projects.filter((project: Project) =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project? This will also remove all associated tasks.')) {
      try {
        await deleteProject(id).unwrap();
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load projects. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage all your projects and teams</p>
        </div>
       <Link
  href="/dashboard/projects/new"  // ✅ Fixed
  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
>
  <Plus className="w-4 h-4" />
  New Project
</Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          aria-label="Search projects"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project: Project) => (
            <div
              key={project._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
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
                        onClick={() => handleDelete(project._id)}
                        disabled={isDeleting}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
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
          ))}
        </div>
      )}
    </div>
  );
}
