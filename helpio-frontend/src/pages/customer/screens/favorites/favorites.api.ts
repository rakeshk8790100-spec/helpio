import type { Favorites } from '@/common/CommonDto';
import { baseApi, dispatchOnSuccess } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { favoritesChanged } from '@/redux/authSlice';

/* Wire format of /customers/me/favorites */
interface FavoritesApiDto {
  skill_ids: string[];
  prompt_open: boolean;
}

const toFavorites = (dto: FavoritesApiDto): Favorites => ({ skillIds: dto.skill_ids, promptOpen: dto.prompt_open });

// Every change also updates the signed-in user, so home and the popup see it at once
const updateUser = dispatchOnSuccess<Favorites>(favoritesChanged);

/** The customer's favourite services: added a few at a time from the popup, or replaced from the profile. */
export const favoritesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFavorites: builder.query<Favorites, void>({
      query: () => APIS.CUSTOMER.FAVORITES,
      transformResponse: toFavorites,
      providesTags: ['Favorites'],
    }),
    /** Popup: up to 4 new services, on top of the saved ones (8 at most) */
    addFavorites: builder.mutation<Favorites, string[]>({
      query: (skillIds) => ({ url: APIS.CUSTOMER.FAVORITES, method: 'POST', body: { skill_ids: skillIds } }),
      transformResponse: toFavorites,
      invalidatesTags: ['Favorites', 'Providers'],
      onQueryStarted: updateUser,
    }),
    /** Popup closed without saving; 3 in a row stop it */
    skipFavorites: builder.mutation<Favorites, void>({
      query: () => ({ url: APIS.CUSTOMER.FAVORITES_SKIP, method: 'POST' }),
      transformResponse: toFavorites,
      invalidatesTags: ['Favorites'],
      onQueryStarted: updateUser,
    }),
    /** Profile: the whole set */
    replaceFavorites: builder.mutation<Favorites, string[]>({
      query: (skillIds) => ({ url: APIS.CUSTOMER.FAVORITES, method: 'PUT', body: { skill_ids: skillIds } }),
      transformResponse: toFavorites,
      invalidatesTags: ['Favorites', 'Providers'],
      onQueryStarted: updateUser,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFavoritesQuery,
  useAddFavoritesMutation,
  useSkipFavoritesMutation,
  useReplaceFavoritesMutation,
} = favoritesApi;
