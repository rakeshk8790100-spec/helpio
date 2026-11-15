import { BriefcaseBusiness, ClipboardList, Home, PlusCircle, Search, UserRound, Wallet } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useGetMeQuery, useLogoutMutation } from '@/common/CommonApi';
import { UserRole } from '@/common/CommonEnum';
import { NotificationBell } from '@/components/common';
import { RouterKeys } from '@/config/router/RouterKeys';
import { LoginModalPage } from '@/pages/auth';
import { FavoritesPage } from '@/pages/customer';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  favoritesEditorClosed,
  favoritesPromptDismissed,
  selectCurrentUser,
  selectFavoritesEditorOpen,
  selectFavoritesPromptPending,
  selectToken,
} from '@/redux/authSlice';
import MainLayout from '@client/main/mainLayout';
import { useNotifications } from './main.notifications';

/** Customers (and signed-out visitors) book and track jobs; providers find work and get paid. */
const CUSTOMER_TABS = [
  { label: 'Home', path: RouterKeys.HOME, Icon: Home },
  { label: 'Search', path: RouterKeys.SEARCH, Icon: Search },
  { label: 'Post', path: RouterKeys.POST_JOB, Icon: PlusCircle },
  { label: 'My jobs', path: RouterKeys.JOBS, Icon: ClipboardList },
  { label: 'Profile', path: RouterKeys.PROFILE, Icon: UserRound },
];
const PROVIDER_TABS = [
  { label: 'Home', path: RouterKeys.HOME, Icon: Home },
  { label: 'Jobs', path: RouterKeys.PRO_JOBS, Icon: BriefcaseBusiness },
  { label: 'Earnings', path: RouterKeys.PRO_EARNINGS, Icon: Wallet },
  { label: 'Profile', path: RouterKeys.PROFILE, Icon: UserRound },
];

/** Log-in, sign-up and password pages: no "Log in" button and no bottom tabs */
const AUTH_SCREENS: string[] = [
  RouterKeys.LOGIN, RouterKeys.SIGNUP, RouterKeys.FORGOT_PASSWORD,
  RouterKeys.PRO_LOGIN, RouterKeys.PRO_SIGNUP, RouterKeys.PRO_FORGOT_PASSWORD,
];

/** Mounted only when signed in, so the unread count is polled only then */
const HeaderBell = () => <NotificationBell {...useNotifications()} />;

/** The app shell for every customer, provider and visitor screen. */
const MainPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const token = useAppSelector(selectToken);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [logout] = useLogoutMutation();
  const [loginOpen, setLoginOpen] = useState(false);
  const dispatch = useAppDispatch();
  const favoritesPending = useAppSelector(selectFavoritesPromptPending);
  const favoritesEditing = useAppSelector(selectFavoritesEditorOpen);
  // Customers: edit from the profile or home, or the popup once after each sign-in while it's still open
  const favoritesMode =
    user?.role !== UserRole.CUSTOMER
      ? null
      : favoritesEditing
        ? 'edit'
        : favoritesPending && user.favoritesPromptOpen
          ? 'add'
          : null;
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  // Refresh the stored user (and validate the token) once per visit
  useGetMeQuery(undefined, { skip: !token });

  const onAuthScreen = AUTH_SCREENS.includes(pathname);
  const tabs = user?.role === UserRole.PROVIDER ? PROVIDER_TABS : CUSTOMER_TABS;
  // The most specific tab for this page lights up: "/jobs/new" is Post, "/jobs/42" is My jobs
  const activePath = tabs
    .map((tab) => tab.path)
    .filter((path) => (path === RouterKeys.HOME ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <MainLayout
      onHome={() => navigate(RouterKeys.HOME)}
      user={user}
      bell={user ? <HeaderBell /> : null}
      onLogout={async () => {
        // Stop Google from silently picking the same account next time
        window.google?.accounts.id.disableAutoSelect();
        await logout();
        void navigate(RouterKeys.HOME);
      }}
      onLogin={onAuthScreen ? null : () => setLoginOpen(true)}
      overlays={
        <>
          {loginOpen && !user && <LoginModalPage onClose={closeLogin} />}
          {user && favoritesMode && (
            <FavoritesPage
              key={favoritesMode}
              user={user}
              mode={favoritesMode}
              onDone={() => dispatch(favoritesMode === 'edit' ? favoritesEditorClosed() : favoritesPromptDismissed())}
            />
          )}
        </>
      }
      content={<Outlet />}
      tabs={
        onAuthScreen
          ? null
          : tabs.map((tab) => ({
              ...tab,
              active: tab.path === activePath,
              onSelect: () => navigate(tab.path),
            }))
      }
    />
  );
};

export default MainPage;
