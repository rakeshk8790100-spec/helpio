import { lazy } from 'react';

export const HomePage = lazy(() => import('@/pages/home/screens/home/home.page'));
export const CustomerHomePage = lazy(() => import('@/pages/home/screens/customerHome/customerHome.page'));
export const ProviderHomePage = lazy(() => import('@/pages/home/screens/providerHome/providerHome.page'));
