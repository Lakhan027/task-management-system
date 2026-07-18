'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useGetMeQuery } from '@/services/authApi';

interface AppHeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/tasks/new': 'New Task',
  '/dashboard/projects': 'Projects',
  '/dashboard/projects/new': 'New Project',
  '/dashboard/profile': 'Profile',
  '/dashboard/profile/change-password': 'Change Password',
};

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const pathname = usePathname();
  const { data } = useGetMeQuery();

  const getTitle = () => {
    if (pathname?.startsWith('/dashboard/tasks/') && pathname?.endsWith('/edit')) return 'Edit Task';
    if (pathname?.startsWith('/dashboard/tasks/')) return 'Task Details';
    if (pathname?.startsWith('/dashboard/projects/') && pathname?.endsWith('/edit')) return 'Edit Project';
    if (pathname?.startsWith('/dashboard/projects/')) return 'Project Details';
    return pageTitles[pathname || ''] || 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-6">
      <button onClick={onMenuToggle} className="lg:hidden text-gray-500 hover:text-gray-700 mr-3">
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-gray-900">{getTitle()}</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{data?.data?.name}</span>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
          {data?.data?.name?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  );
}
