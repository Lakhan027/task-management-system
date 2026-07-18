import { CreateTaskRequest, Task, TaskFilters, TasksResponse, TaskStats, UpdateTaskRequest } from '@/types/task';
import { api } from './api';

export const taskApi = api.injectEndpoints({
  endpoints: (builder) => ({
     getTasks: builder.query<TasksResponse, TaskFilters>({
      query: (params) => ({
        url: '/tasks',
        params,
      }),
       transformResponse: (response: TasksResponse) => {
        // Backend returns: { tasks: [], pagination: {} }
        return {
          tasks: response.tasks || [],
          pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
        };
      },

      providesTags: (result) =>
        result?.tasks?.map((t) => ({ type: 'Task' as const, id: t._id })) || [{ type: 'Task' as const, id: 'LIST' }],
    }),

    getTask: builder.query<Task, string>({
  query: (id) => `/tasks/${id}`,
  transformResponse: (response: Task) => response, // returns the task directly
  providesTags: (result, error, id) => [{ type: 'Task', id }],
}),

    createTask: builder.mutation<Task, CreateTaskRequest>({
      query: (body) => ({
        url: '/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    updateTask: builder.mutation<Task, { id: string; body: UpdateTaskRequest }>({
      query: ({ id, body }) => ({
        url: `/tasks/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
    }),

    updateTaskStatus: builder.mutation<Task, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/tasks/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
    }),

    deleteTask: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    addComment: builder.mutation<Task, { id: string; text: string }>({
      query: ({ id, text }) => ({
        url: `/tasks/${id}/comments`,
        method: 'POST',
        body: { text },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
    }),

    getTaskStats: builder.query<TaskStats, void>({
      query: () => '/tasks/stats',
      providesTags: [{ type: 'Task', id: 'STATS' }],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
  useAddCommentMutation,
  useGetTaskStatsQuery,
} = taskApi;
