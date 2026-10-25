
import { Layout } from "antd";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Home, Search, UserRound } from "lucide-react";
import { useGetMeQuery, useLogoutMutation } from "../../common/CommonApi";
import { RouterKeys } from "../../config/router/RouterKeys";
import { useAppSelector } from "../../redux";
import { selectCurrentUser, selectToken } from "../../redux/authSlice";
import { HelpioLogo, UserMenu } from "../marketplace";

const { Header, Content, Footer } = Layout;

const tabs = [
  { label: "Home", path: RouterKeys.HOME, Icon: Home },
  { label: "Search", path: RouterKeys.SEARCH, Icon: Search },
  { label: "Bookings", path: RouterKeys.BOOKINGS, Icon: CalendarDays },
  { label: "Profile", path: RouterKeys.PROFILE, Icon: UserRound },
];

/** Log-in, sign-up and password pages: no "Log in" button and no bottom tabs, so the form has the screen */
const AUTH_SCREENS: string[] = [
  RouterKeys.LOGIN, RouterKeys.SIGNUP, RouterKeys.FORGOT_PASSWORD,
  RouterKeys.PRO_LOGIN, RouterKeys.PRO_SIGNUP, RouterKeys.PRO_FORGOT_PASSWORD,
];

const AppLayout = () => {
  const user = useAppSelector(selectCurrentUser);
  const token = useAppSelector(selectToken);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [logout] = useLogoutMutation();
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
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            !onAuthScreen && (
              <NavLink
                to={RouterKeys.LOGIN}
                className="flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold !text-white"
              >
                Log in
              </NavLink>
            )
          )}
        </Header>

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
            {tabs.map(({ label, path, Icon }) => (
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
