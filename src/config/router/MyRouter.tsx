import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import AppLayout from "../../component/layout/appLayout";
import ComingSoon from "../../component/layout/comingSoon";
import { UserRole } from "../../common/CommonEnum";
import RequireAuth from "../../pages/auth/RequireAuth";
import { authRoutes } from "../../pages/auth/routes";
import HomePage from "../../pages/home/home.page";
import { customerJobRoutes, providerJobRoutes } from "../../pages/jobs/routes";
import { onboardingRoutes } from "../../pages/onboarding/routes";
import { RouterKeys } from "./RouterKeys";

/** Screens planned but not built yet; listed so each sits behind the right role. */
const comingSoon = (paths: string[]): RouteObject[] => paths.map((path) => ({ path, element: <ComingSoon /> }));

const myRouter = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      // Landing page when signed out, customer or provider home when signed in
      { index: true, element: <HomePage /> },
      // Public: customer and provider log-in, sign-up and password reset
      ...authRoutes,
      // Provider sign-up steps 2 and 3
      { element: <RequireAuth roles={[UserRole.PROVIDER]} />, children: onboardingRoutes },
      // Customer jobs: post, list, job hub and chat
      {
        element: <RequireAuth roles={[UserRole.CUSTOMER]} />,
        children: [...customerJobRoutes, ...comingSoon([RouterKeys.JOB_CHAT])],
      },
      // Provider work: verification, nearby jobs, active job and earnings
      {
        element: <RequireAuth roles={[UserRole.PROVIDER]} />,
        children: [
          ...providerJobRoutes,
          ...comingSoon([RouterKeys.PRO_VERIFICATION, RouterKeys.PRO_WORK, RouterKeys.PRO_EARNINGS]),
        ],
      },
      // Everything else needs login; screens not built yet show ComingSoon
      { element: <RequireAuth />, children: [{ path: "*", element: <ComingSoon /> }] },
    ],
  },
]);

export default myRouter;
