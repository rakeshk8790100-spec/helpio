
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../../component/layout/appLayout";
 

const myRouter = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout/>,
    children: [],
  },
]);

export default myRouter;
