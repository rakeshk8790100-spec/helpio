import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './http.config';

/**
 * Global cache tags for RTK Query.
 * All feature modules that inject endpoints can provide and invalidate these tags,
 * enabling unified caching and cross-feature tag invalidation.
 */
export const TAG_TYPES = [
  'Auth',
  'User',
  'Employee',
  'Attendance',
  'Leave',
  'Shift',
  'Department',
  'Branch',
  'Role',
  'Organization',
  'Workflow',
  'Master',
  'Common',
  'Service',
] as const;

export type TagType = (typeof TAG_TYPES)[number];

/**
 * Single shared RTK Query Base API service.
 *
 * NOTE: Do NOT create separate `createApi` instances per feature.
 * Always inject endpoints into this `baseApi` using `baseApi.injectEndpoints()`:
 *
 * @example
 * ```ts
 * import { baseApi } from '@/config/base_service/base.api';
 *
 * export const employeeApi = baseApi.injectEndpoints({
 *   endpoints: (builder) => ({
 *     getEmployees: builder.query<Employee[], QueryParams>({
 *       query: (params) => ({ url: '/employees', params }),
 *       providesTags: (result) =>
 *         result
 *           ? [
 *               ...result.map(({ id }) => ({ type: 'Employee' as const, id })),
 *               { type: 'Employee', id: 'LIST' },
 *             ]
 *           : [{ type: 'Employee', id: 'LIST' }],
 *     }),
 *     createEmployee: builder.mutation<Employee, CreateEmployeeDto>({
 *       query: (body) => ({
 *         url: '/employees',
 *         method: 'POST',
 *         body,
 *       }),
 *       invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
 *     }),
 *   }),
 *   overrideExisting: false,
 * });
 *
 * export const { useGetEmployeesQuery, useCreateEmployeeMutation } = employeeApi;
 * ```
 */
export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery,
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
});

export default baseApi;
