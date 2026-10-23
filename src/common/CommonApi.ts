import { baseApi, dispatchOnSuccess } from '../config/base_service/base.api';
import { sessionStarted, signedOut, userUpdated } from '../redux/authSlice';
import type { AuthSession, AuthUser, Service } from './CommonDto';
import type { OnboardingStatus, UserRole } from './CommonEnum';
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

export const { useSearchServicesQuery, useGetMeQuery, useUpdateMeMutation, useLogoutMutation } = commonApi;
