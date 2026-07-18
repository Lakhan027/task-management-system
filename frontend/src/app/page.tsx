'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGetMeQuery } from '@/services/authApi';

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading } = useGetMeQuery();

  useEffect(() => {
    if (!isLoading) {
      if (data?.success) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [data, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}