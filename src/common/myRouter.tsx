
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../component/layout/appLayout";


const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout/>,
    children: [],
  },
]);

export default router;
