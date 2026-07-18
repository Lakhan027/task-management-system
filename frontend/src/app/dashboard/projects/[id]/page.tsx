'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGetProjectQuery, useDeleteProjectMutation } from '@/services/projectApi';
import { useGetTasksQuery } from '@/services/taskApi';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import {
  ArrowLeft,
  Edit,
  Trash2,
  ListTodo,
} from 'lucide-react';
import { Task } from '@/types/task';
import ProjectMembers from '@/components/projects/ProjectMembers';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, isError } = useGetProjectQuery(id);
  const { data: tasksData } = useGetTasksQuery({ projectId: id });
  const [deleteProject] = useDeleteProjectMutation();

  const project = data;
  const tasks = tasksData?.tasks || [];

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id).unwrap();
        router.push('/dashboard/projects');
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
        <h2 className="text-xl font-semibold text-gray-900">Failed to load project</h2>
        <p className="text-gray-500 mt-2">Please try again later.</p>
        <Link href="/dashboard/projects" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Project not found</h2>
        <Link href="/dashboard/projects" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      {/* Project Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <ProjectStatusBadge status={project.status} />
              <span className="text-sm text-gray-500">
                {project.visibility.charAt(0).toUpperCase() + project.visibility.slice(1)}
              </span>
              {project.tags?.map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/projects/${id}/edit`}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </Link>
            <button
              onClick={handleDelete}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {project.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {project.startDate && (
            <div>
              <span className="text-gray-500">Start Date:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {new Date(project.startDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {project.endDate && (
            <div>
              <span className="text-gray-500">End Date:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {new Date(project.endDate).toLocaleDateString()}
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-2 text-gray-900 font-medium">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <ProjectMembers projectId={id} members={project.members || []} ownerId={project.ownerId} />

      {/* Project Tasks */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <ListTodo className="w-5 h-5" />
          Tasks ({tasks.length})
        </h2>
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-sm">No tasks in this project yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task: Task) => (
              <Link
                key={task._id}
                href={`/dashboard/tasks/${task._id}`}
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{task.title}</span>
                  <span className="text-sm text-gray-500 capitalize">{task.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
