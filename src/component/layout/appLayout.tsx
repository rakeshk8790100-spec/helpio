
import { Layout } from "antd";
import { Outlet, NavLink } from "react-router-dom";
import { CalendarDays, Home, Search, UserRound } from "lucide-react";
import { RouterKeys } from "../../config/router/RouterKeys";

const { Header, Content, Footer } = Layout;

const tabs = [
  { label: "Home", path: RouterKeys.HOME, Icon: Home },
  { label: "Search", path: RouterKeys.SEARCH, Icon: Search },
  { label: "Bookings", path: RouterKeys.BOOKINGS, Icon: CalendarDays },
  { label: "Profile", path: RouterKeys.PROFILE, Icon: UserRound },
];

const AppLayout = () => {
  return (
    <div className="min-h-dvh w-full bg-slate-100 sm:flex sm:justify-center">
      <Layout className="!h-dvh !w-full !max-w-[430px] !overflow-hidden !bg-white sm:border-x sm:border-slate-200">
        {/* Header */}
        <Header className="!flex !h-16 !shrink-0 !items-center !justify-between !border-b !border-slate-100 !bg-white !px-5 !leading-normal">
          <NavLink to={RouterKeys.HOME} className="text-xl font-bold tracking-tight !text-slate-900">
            helpio
          </NavLink>

          {/* Logged-out state until auth is wired */}
          <NavLink
            to={RouterKeys.LOGIN}
            className="flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold !text-white"
          >
            Log in
          </NavLink>
        </Header>

        {/* Dynamic page content */}
        <Content className="!min-h-0 !flex-1 !overflow-y-auto !bg-white !px-5 !py-5">
          <Outlet />
        </Content>

        {/* Bottom tab navigation */}
        <Footer className="!shrink-0 !border-t !border-slate-200 !bg-white !p-0">
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
                      ? "text-indigo-600"
                      : "text-slate-500"
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
