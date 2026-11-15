import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import type { AuditEntryApiDto, AuditFilters, PageApiDto } from '@/pages/admin/types/admin.dto';
import type { AuditEntry, Paged } from '@/pages/admin/types/admin.models';

const toAuditEntry = (dto: AuditEntryApiDto): AuditEntry => ({
  id: dto.id,
  action: dto.action,
  summary: dto.summary,
  actor: dto.actor,
  targetType: dto.target_type,
  targetId: dto.target_id,
  details: dto.details,
  ip: dto.ip,
  createdAt: dto.created_at,
});

/** Endpoints only this admin screen uses. */
export const auditLogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLog: builder.query<Paged<AuditEntry>, AuditFilters>({
      query: (f) => ({ url: APIS.ADMIN.AUDIT, params: { page: f.page, page_size: f.pageSize, ...(f.action && { action: f.action }) } }),
      transformResponse: (dto: PageApiDto<AuditEntryApiDto>) => ({
        items: dto.items.map(toAuditEntry),
        total: dto.total,
        page: dto.page,
        pageSize: dto.page_size,
      }),
      providesTags: ['Audit'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAuditLogQuery } = auditLogApi;
