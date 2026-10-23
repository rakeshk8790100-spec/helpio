import type { RouteObject } from 'react-router-dom';
import { RouterKeys } from '../../config/router/RouterKeys';
import LoginPage from './screens/login/login.page';
import RegisterPage from './screens/register/register.page';

/** Public auth routes, spread into the app router as children of AppLayout. */
export const authRoutes: RouteObject[] = [
  { path: RouterKeys.LOGIN, Component: LoginPage },
  { path: RouterKeys.REGISTER, Component: RegisterPage },
];
