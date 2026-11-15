import { lazy } from 'react';

/** The favourite services popup, opened by the app shell after sign-in or from the profile and home */
export const FavoritesPage = lazy(() => import('@/pages/customer/screens/favorites/favorites.page'));
