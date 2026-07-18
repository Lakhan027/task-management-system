import ProjectForm from '@/components/projects/ProjectForm';

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <ProjectForm />
      </div>
    </div>
  );
}