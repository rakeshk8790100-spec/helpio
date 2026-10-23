import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../../component/layout/appLayout";
import ComingSoon from "../../component/layout/comingSoon";
import { UserRole } from "../../common/CommonEnum";
import RequireAuth from "../../pages/auth/RequireAuth";
import { authRoutes } from "../../pages/auth/routes";
import HeroPage from "../../pages/hero/hero.page";
import { onboardingRoutes } from "../../pages/onboarding/routes";

const myRouter = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      // Public: landing page, login, provider sign-up step 1
      { index: true, element: <HeroPage /> },
      ...authRoutes,
      // Provider sign-up steps 2 and 3
      { element: <RequireAuth roles={[UserRole.PROVIDER]} />, children: onboardingRoutes },
      // Everything else needs login; screens not built yet show ComingSoon
      { element: <RequireAuth />, children: [{ path: "*", element: <ComingSoon /> }] },
    ],
  },
]);

export default myRouter;
