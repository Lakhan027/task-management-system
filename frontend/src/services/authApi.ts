import { api } from './api';
import { setUser, logout } from '@/stores/authSlice';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth';

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<ApiResponse<User>, RegisterRequest>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),

    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Backend sets HTTP-only cookie, returns user only
          if (data?.data?.user) {
            dispatch(setUser(data.data.user));
          }
        } catch (error) {
          console.error('Login error:', error);
        }
      },
    }),

    logout: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(logout());
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
    }),

    getMe: builder.query<ApiResponse<User>, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success && data?.data) {
            dispatch(setUser(data.data));
          } else {
            dispatch(logout());
          }
        } catch {
          dispatch(logout());
        }
      },
    }),

    changePassword: builder.mutation<ApiResponse<null>, { oldPassword: string; newPassword: string }>({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useChangePasswordMutation,
} = authApi;
