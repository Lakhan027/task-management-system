import { api } from './api';
import { ApiResponse } from '@/types/api';
import { DashboardData } from '@/types/dashboard';

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardData, void>({
      query: () => '/dashboard',
        transformResponse: (response: ApiResponse<DashboardData>) => {
        // Backend returns: { success: true, data: {...} }
        return response.data;
      },
      providesTags: ['Dashboard'],
    }),

    getHealth: builder.query<DashboardData, void>({
      query: () => '/dashboard/health',
      transformResponse: (response: ApiResponse<DashboardData>) => response.data,
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardQuery, useGetHealthQuery } = dashboardApi;
