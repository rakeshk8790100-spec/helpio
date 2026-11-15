import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import { toCheck } from '@/pages/admin/admin.api';
import type { SettingsApiDto } from '@/pages/admin/types/admin.dto';
import type { AppSettings, ServiceCheck } from '@/pages/admin/types/admin.models';

const toSettings = (dto: SettingsApiDto): AppSettings => ({ groups: dto.groups, canStoreSecrets: dto.can_store_secrets });

/** Endpoints only this admin screen uses. */
export const appSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppSettings: builder.query<AppSettings, void>({
      query: () => APIS.ADMIN.SETTINGS,
      transformResponse: toSettings,
      providesTags: ['Settings'],
    }),
    /** `null` goes back to the .env value */
    updateAppSettings: builder.mutation<AppSettings, Record<string, string | null>>({
      query: (changes) => ({ url: APIS.ADMIN.SETTINGS, method: 'PUT', body: { changes } }),
      transformResponse: toSettings,
      invalidatesTags: ['Settings', 'Status', 'Audit'],
    }),
    testAppSettings: builder.mutation<ServiceCheck, string>({
      query: (group) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.SETTINGS_TEST, { group }), method: 'POST' }),
      transformResponse: toCheck,
      invalidatesTags: ['Status'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAppSettingsQuery, useUpdateAppSettingsMutation, useTestAppSettingsMutation } = appSettingsApi;
