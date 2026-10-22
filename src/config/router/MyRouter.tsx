
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../../component/layout/appLayout";
import ComingSoon from "../../component/layout/comingSoon";
import HeroPage from "../../pages/hero/hero.page";


const myRouter = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout/>,
    children: [
      // Public landing page
      { index: true, element: <HeroPage /> },
      // Screens linked from the app that are not built yet
      { path: "*", element: <ComingSoon /> },
    ],
  },
]);

export default myRouter;
