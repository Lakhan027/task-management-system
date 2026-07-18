'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useGetMeQuery, useLogoutMutation } from '@/services/authApi';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut } from 'lucide-react';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push('/login');
  };

  const userName = data?.data?.name || 'User';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold hover:bg-blue-200 transition-colors"
      >
        {initial}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500">{data?.data?.email}</p>
          </div>
          <Link
            href="/dashboard/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <User className="w-4 h-4" />
            Profile
          </Link>
          <Link
            href="/dashboard/profile/change-password"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            Change Password
          </Link>
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
