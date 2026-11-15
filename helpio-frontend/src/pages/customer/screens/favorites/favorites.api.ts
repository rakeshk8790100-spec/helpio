import type { Favorites } from '@/common/CommonDto';
import { baseApi, dispatchOnSuccess } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { favoritesChanged } from '@/redux/authSlice';

/* Wire format of /customers/me/favorites */
interface FavoritesApiDto {
  skill_ids: string[];
  requests?: { id: string; name: string }[];
  prompt_open: boolean;
}

const toFavorites = (dto: FavoritesApiDto): Favorites => ({
  skillIds: dto.skill_ids,
  requests: dto.requests ?? [],
  promptOpen: dto.prompt_open,
});

/** Catalog services picked, and names typed for services the catalog doesn't have */
export interface FavoritesChoice {
  skillIds: string[];
  serviceNames: string[];
}

const toBody = ({ skillIds, serviceNames }: FavoritesChoice) => ({ skill_ids: skillIds, service_names: serviceNames });

// Every change also updates the signed-in user, so home and the popup see it at once
const updateUser = dispatchOnSuccess<Favorites>(favoritesChanged);

/** The customer's favourite services: added from the popup after sign-in, or replaced from the profile. */
export const favoritesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFavorites: builder.query<Favorites, void>({
      query: () => APIS.CUSTOMER.FAVORITES,
      transformResponse: toFavorites,
      providesTags: ['Favorites'],
    }),
    /** Popup: new services on top of the saved ones (8 at most); typed names become requests */
    addFavorites: builder.mutation<Favorites, FavoritesChoice>({
      query: (choice) => ({ url: APIS.CUSTOMER.FAVORITES, method: 'POST', body: toBody(choice) }),
      transformResponse: toFavorites,
      invalidatesTags: ['Favorites', 'Providers'],
      onQueryStarted: updateUser,
    }),
    /** Popup closed without saving; it comes back next visit until there are 8 */
    skipFavorites: builder.mutation<Favorites, void>({
      query: () => ({ url: APIS.CUSTOMER.FAVORITES_SKIP, method: 'POST' }),
      transformResponse: toFavorites,
      invalidatesTags: ['Favorites'],
      onQueryStarted: updateUser,
    }),
    /** Profile: the whole set; requests left out are withdrawn */
    replaceFavorites: builder.mutation<Favorites, FavoritesChoice>({
      query: (choice) => ({ url: APIS.CUSTOMER.FAVORITES, method: 'PUT', body: toBody(choice) }),
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
