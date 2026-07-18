import { CreateProjectRequest, Project, UpdateProjectRequest } from '@/types/project';
import { api } from './api';

export const projectApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
       transformResponse: (response: Project[]) => {
        // Backend returns array directly
        return response || [];
      },
      providesTags: (result) =>
        result?.map((p) => ({ type: 'Project' as const, id: p._id })) || [{ type: 'Project' as const, id: 'LIST' }],
    }),

    getProject: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
        transformResponse: (response: Project) => {
        // Backend returns project directly
        return response;
      },
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),

    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),

    updateProject: builder.mutation<Project, { id: string; body: UpdateProjectRequest }>({
      query: ({ id, body }) => ({
        url: `/projects/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
    }),

    deleteProject: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),

    addMember: builder.mutation<Project, { projectId: string; memberUserId: number; role?: string }>({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Project', id: projectId }],
    }),

    removeMember: builder.mutation<Project, { projectId: string; memberUserId: number }>({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/members`,
        method: 'DELETE',
        body,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Project', id: projectId }],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAddMemberMutation,
  useRemoveMemberMutation,
} = projectApi;
