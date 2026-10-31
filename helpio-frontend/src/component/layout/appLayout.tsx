
import { useCallback, useState } from "react";
import { Layout } from "antd";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { BriefcaseBusiness, ClipboardList, Home, Search, UserRound, Wallet } from "lucide-react";
import { useGetMeQuery, useLogoutMutation } from "../../common/CommonApi";
import { UserRole } from "../../common/CommonEnum";
import { RouterKeys } from "../../config/router/RouterKeys";
import { useAppDispatch, useAppSelector } from "../../redux";
import {
  favoritesEditorClosed,
  favoritesPromptDismissed,
  selectCurrentUser,
  selectFavoritesEditorOpen,
  selectFavoritesPromptPending,
  selectToken,
} from "../../redux/authSlice";
import LoginModal from "../../pages/auth/LoginModal";
import FavoritesModal from "../../pages/customer/FavoritesModal";
import { useNotifications } from "../../hooks/useNotifications";
import { HelpioLogo, NotificationBell, UserMenu } from "../marketplace";

const { Header, Content, Footer } = Layout;

/** Customers (and signed-out visitors) book and track jobs; providers find work and get paid. */
const CUSTOMER_TABS = [
  { label: "Home", path: RouterKeys.HOME, Icon: Home },
  { label: "Search", path: RouterKeys.SEARCH, Icon: Search },
  { label: "My jobs", path: RouterKeys.JOBS, Icon: ClipboardList },
  { label: "Profile", path: RouterKeys.PROFILE, Icon: UserRound },
];
const PROVIDER_TABS = [
  { label: "Home", path: RouterKeys.HOME, Icon: Home },
  { label: "Jobs", path: RouterKeys.PRO_JOBS, Icon: BriefcaseBusiness },
  { label: "Earnings", path: RouterKeys.PRO_EARNINGS, Icon: Wallet },
  { label: "Profile", path: RouterKeys.PROFILE, Icon: UserRound },
];

/** Log-in, sign-up and password pages: no "Log in" button and no bottom tabs, so the form has the screen */
const AUTH_SCREENS: string[] = [
  RouterKeys.LOGIN, RouterKeys.SIGNUP, RouterKeys.FORGOT_PASSWORD,
  RouterKeys.PRO_LOGIN, RouterKeys.PRO_SIGNUP, RouterKeys.PRO_FORGOT_PASSWORD,
];

/** Mounted only when signed in, so the unread count is polled only then */
const HeaderBell = () => <NotificationBell {...useNotifications()} />;

const AppLayout = () => {
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
        ? "edit"
        : favoritesPending && user.favoritesPromptOpen
          ? "add"
          : null;
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  // Refresh the stored user (and validate the token) once per visit
  useGetMeQuery(undefined, { skip: !token });

  const onLogout = async () => {
    // Stop Google from silently picking the same account next time
    window.google?.accounts.id.disableAutoSelect();
    await logout();
    navigate(RouterKeys.HOME);
  };
  const onAuthScreen = AUTH_SCREENS.includes(pathname);

  return (
    <div className="min-h-dvh w-full bg-slate-100 sm:flex sm:justify-center">
      <Layout className="!h-dvh !w-full !max-w-[430px] !overflow-hidden !bg-white sm:border-x sm:border-slate-200">
        {/* Header */}
        <Header className="!flex !h-16 !shrink-0 !items-center !justify-between !border-b !border-slate-100 !bg-white !px-5 !leading-normal">
          <NavLink to={RouterKeys.HOME} className="rounded-lg active:scale-95">
            <HelpioLogo />
          </NavLink>

          {user ? (
            <div className="flex items-center gap-1">
              <HeaderBell />
              <UserMenu user={user} onLogout={onLogout} />
            </div>
          ) : (
            !onAuthScreen && (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white active:scale-95"
              >
                Log in
              </button>
            )
          )}
        </Header>
        {loginOpen && !user && <LoginModal onClose={closeLogin} />}
        {user && favoritesMode && (
          <FavoritesModal
            key={favoritesMode}
            user={user}
            mode={favoritesMode}
            onDone={() => dispatch(favoritesMode === "edit" ? favoritesEditorClosed() : favoritesPromptDismissed())}
          />
        )}

        {/* Dynamic page content */}
        <Content className="!min-h-0 !flex-1 !overflow-y-auto !bg-white !px-5 !py-5">
          <Outlet />
        </Content>

        {/* Bottom tab navigation */}
        <Footer hidden={onAuthScreen} className="!shrink-0 !border-t !border-slate-200 !bg-white !p-0">
          <nav
            aria-label="Bottom navigation"
            className="grid grid-cols-4"
          >
            {(user?.role === UserRole.PROVIDER ? PROVIDER_TABS : CUSTOMER_TABS).map(({ label, path, Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                className={({ isActive }) =>
                  `flex min-h-[64px] flex-col items-center justify-center gap-1 text-xs ${
                    isActive
                      ? "!text-indigo-600"
                      : "!text-slate-500"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={21}
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                    <span className={isActive ? "font-semibold" : ""}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </Footer>
      </Layout>
    </div>
  );
};

export default AppLayout;
