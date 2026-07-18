import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    credentials: 'include', // ✅ HTTP-only cookie will be sent automatically
    prepareHeaders: (headers) => {
      // ✅ No need to add Authorization header – cookie handles auth
      return headers;
    },
  }),
  tagTypes: ['Auth', 'Task', 'Project', 'Dashboard', 'User'],
  endpoints: () => ({}),
});