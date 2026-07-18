'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  return { user, isAuthenticated, isLoading, isAdmin: user?.role === 'admin' };
}
