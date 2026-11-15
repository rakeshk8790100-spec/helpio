import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import type { CategoryApiDto } from '@/pages/admin/types/admin.dto';
import type { AdminCategory } from '@/pages/admin/types/admin.models';

const toCategory = (dto: CategoryApiDto): AdminCategory => ({
  id: dto.id,
  name: dto.name,
  icon: dto.icon,
  sortOrder: dto.sort_order,
  isActive: dto.is_active,
  jobs: dto.jobs,
  skills: dto.skills.map((s) => ({ id: s.id, name: s.name, sortOrder: s.sort_order, isActive: s.is_active, providers: s.providers })),
});

/** Endpoints only this admin screen uses. */
export const catalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminCatalog: builder.query<AdminCategory[], void>({
      query: () => APIS.ADMIN.CATALOG,
      transformResponse: (dto: CategoryApiDto[]) => dto.map(toCategory),
      providesTags: ['AdminCatalog'],
    }),
    saveCategory: builder.mutation<AdminCategory[], { id?: string; name: string; icon: string; sortOrder: number; isActive: boolean }>({
      query: ({ id, name, icon, sortOrder, isActive }) => ({
        url: id ? replaceUrlPlaceholders(APIS.ADMIN.CATEGORY, { id }) : APIS.ADMIN.CATEGORIES,
        method: id ? 'PUT' : 'POST',
        body: { name, icon, sort_order: sortOrder, is_active: isActive },
      }),
      transformResponse: (dto: CategoryApiDto[]) => dto.map(toCategory),
      invalidatesTags: ['AdminCatalog', 'Catalog', 'Audit'],
    }),
    saveSkill: builder.mutation<AdminCategory[], { categoryId: string; id?: string; name: string; sortOrder: number; isActive: boolean }>({
      query: ({ categoryId, id, name, sortOrder, isActive }) => ({
        url: id ? replaceUrlPlaceholders(APIS.ADMIN.SKILL, { categoryId, id }) : replaceUrlPlaceholders(APIS.ADMIN.SKILLS, { categoryId }),
        method: id ? 'PUT' : 'POST',
        body: { name, sort_order: sortOrder, is_active: isActive },
      }),
      transformResponse: (dto: CategoryApiDto[]) => dto.map(toCategory),
      invalidatesTags: ['AdminCatalog', 'Catalog', 'Audit'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminCatalogQuery, useSaveCategoryMutation, useSaveSkillMutation } = catalogApi;
