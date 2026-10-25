import { baseApi, dispatchOnSuccess } from '../config/base_service/base.api';
import { sessionStarted, signedOut, userUpdated } from '../redux/authSlice';
import type { AuthSession, AuthUser, Job, JobQuote, MapCircle, NearbyJob, Service, SkillCategory } from './CommonDto';
import type { InviteStatus, JobStatus, OnboardingStatus, QuoteStatus, UserRole } from './CommonEnum';
import { MOCK_SERVICES } from './CommonMock';

/* ── Wire format (snake_case) of the session endpoints, mapped once here ── */

export interface UserApiDto {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  onboarding_status: OnboardingStatus | null;
}

export interface SessionApiDto {
  access_token: string;
  token_type: 'bearer';
  user: UserApiDto;
}

export const toAuthUser = (dto: UserApiDto): AuthUser => ({
  id: dto.id,
  email: dto.email,
  name: dto.name,
  phone: dto.phone,
  role: dto.role,
  avatarUrl: dto.avatar_url,
  onboardingStatus: dto.onboarding_status,
});

export const toAuthSession = (dto: SessionApiDto): AuthSession => ({
  token: dto.access_token,
  user: toAuthUser(dto.user),
});

/* ── Jobs wire format (money in paise), shared by the customer and provider screens ── */

export interface JobApiDto {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  latitude: number | null;
  longitude: number | null;
  area_name: string | null;
  pincode: string | null;
  budget_paise: number | null;
  scheduled_at: string | null;
  duration_mins: number | null;
  is_emergency: boolean;
  status: JobStatus;
  progress_pct: number;
  quote_count: number;
  lowest_quote_paise: number | null;
  updated_at: string;
  edited_at: string | null;
}

export interface QuoteApiDto {
  id: string;
  job_id: string;
  amount_paise: number;
  message: string | null;
  status: QuoteStatus;
}

export interface NearbyJobApiDto {
  id: string;
  title: string;
  description: string | null;
  category_name: string | null;
  area_name: string | null;
  approx_distance_km: number | null;
  customer_label: string;
  budget_paise: number | null;
  scheduled_at: string | null;
  is_emergency: boolean;
  status: JobStatus;
  progress_pct: number;
  quote_count: number;
  my_quote: QuoteApiDto | null;
  edited_after_my_quote: boolean;
  invite_status: InviteStatus | null;
  invite_message: string | null;
  area_circle: MapCircleApiDto | null;
}

export interface MapCircleApiDto {
  latitude: number;
  longitude: number;
  radius_m: number;
}

/** Paise → ₹ (nullable) */
export const toRupees = <T extends number | null>(paise: T) => (paise === null ? null : paise / 100) as T;

export const toJob = (dto: JobApiDto): Job => ({
  id: dto.id,
  title: dto.title,
  description: dto.description,
  categoryId: dto.category_id,
  categoryName: dto.category_name,
  coordinates: dto.latitude !== null && dto.longitude !== null ? { latitude: dto.latitude, longitude: dto.longitude } : null,
  areaName: dto.area_name,
  pincode: dto.pincode,
  budget: toRupees(dto.budget_paise),
  scheduledAt: dto.scheduled_at,
  durationMins: dto.duration_mins,
  isEmergency: dto.is_emergency,
  status: dto.status,
  progressPct: dto.progress_pct,
  quoteCount: dto.quote_count,
  lowestQuote: toRupees(dto.lowest_quote_paise),
  updatedAt: dto.updated_at,
  editedAt: dto.edited_at,
});

export const toJobQuote = (dto: QuoteApiDto): JobQuote => ({
  id: dto.id,
  jobId: dto.job_id,
  amount: toRupees(dto.amount_paise),
  message: dto.message,
  status: dto.status,
});

export const toNearbyJob = (dto: NearbyJobApiDto): NearbyJob => ({
  id: dto.id,
  title: dto.title,
  description: dto.description,
  categoryName: dto.category_name,
  areaName: dto.area_name,
  approxDistanceKm: dto.approx_distance_km,
  customerLabel: dto.customer_label,
  budget: toRupees(dto.budget_paise),
  scheduledAt: dto.scheduled_at,
  isEmergency: dto.is_emergency,
  status: dto.status,
  progressPct: dto.progress_pct,
  quoteCount: dto.quote_count,
  myQuote: dto.my_quote && toJobQuote(dto.my_quote),
  editedAfterMyQuote: dto.edited_after_my_quote,
  inviteStatus: dto.invite_status,
  inviteMessage: dto.invite_message,
  areaCircle: dto.area_circle && toMapCircle(dto.area_circle),
});

export const toMapCircle = (dto: MapCircleApiDto): MapCircle => ({
  latitude: dto.latitude,
  longitude: dto.longitude,
  radiusM: dto.radius_m,
});

/** Store the session returned by a sign-in mutation as soon as it succeeds. */
export const startSessionOnSuccess = dispatchOnSuccess<AuthSession>(sessionStarted);

/** Endpoints shared by several screens (landing, search, app shell, sign-in flows). */
export const commonApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Mocked until the backend is ready; replace with `query: (q) => ({ url: '/services', params: { q } })`
    searchServices: builder.query<Service[], string>({
      queryFn: (q) => {
        const term = q.trim().toLowerCase();
        const data = MOCK_SERVICES.filter((s) => s.name.toLowerCase().includes(term));
        return new Promise((resolve) => setTimeout(() => resolve({ data }), 200));
      },
      providesTags: ['Service'],
    }),

    /** Public skills catalogue grouped by category (provider skills, job categories) */
    getSkillCatalog: builder.query<SkillCategory[], void>({
      query: () => '/catalog/skills',
      providesTags: ['Catalog'],
    }),

    /** Refreshes the stored user (role, profile, onboarding progress) from the server. */
    getMe: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      transformResponse: toAuthUser,
      providesTags: ['Session'],
      // A 401 ends the session in baseQuery; other failures keep the stored user.
      onQueryStarted: dispatchOnSuccess<AuthUser>(userUpdated),
    }),

    updateMe: builder.mutation<AuthUser, { name?: string; phone?: string }>({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      transformResponse: toAuthUser,
      onQueryStarted: dispatchOnSuccess<AuthUser>(userUpdated),
    }),

    /** Signs out other devices; this one continues with the returned session. */
    changePassword: builder.mutation<AuthSession, { currentPassword: string; newPassword: string }>({
      query: ({ currentPassword, newPassword }) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
      }),
      transformResponse: toAuthSession,
      onQueryStarted: startSessionOnSuccess,
    }),

    uploadAvatar: builder.mutation<AuthUser, File>({
      query: (file) => {
        const body = new FormData();
        body.append('file', file);
        return { url: '/auth/me/avatar', method: 'POST', body, timeout: 60_000 };
      },
      transformResponse: toAuthUser,
      onQueryStarted: dispatchOnSuccess<AuthUser>(userUpdated),
    }),

    removeAvatar: builder.mutation<AuthUser, void>({
      query: () => ({ url: '/auth/me/avatar', method: 'DELETE' }),
      transformResponse: toAuthUser,
      onQueryStarted: dispatchOnSuccess<AuthUser>(userUpdated),
    }),

    /** Revokes the token on the server. The local session ends even if that call fails. */
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        await queryFulfilled.catch(() => undefined);
        dispatch(signedOut());
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useSearchServicesQuery,
  useGetSkillCatalogQuery,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useLogoutMutation,
} = commonApi;
