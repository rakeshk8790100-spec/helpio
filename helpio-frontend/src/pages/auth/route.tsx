import type { RouteObject } from 'react-router-dom';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import {
  CustomerForgotPasswordPage,
  LoginPage,
  ProForgotPasswordPage,
  ProLoginPage,
  RegisterPage,
  SignupPage,
} from '@/pages/auth';

/** Public auth routes, children of the app shell. Customers and providers each get their own pages. */
export const authRoutes: RouteObject[] = [
  { path: RouterKeys.LOGIN, element: <SuspenseWrapper><LoginPage /></SuspenseWrapper> },
  { path: RouterKeys.SIGNUP, element: <SuspenseWrapper><SignupPage /></SuspenseWrapper> },
  { path: RouterKeys.FORGOT_PASSWORD, element: <SuspenseWrapper><CustomerForgotPasswordPage /></SuspenseWrapper> },
  { path: RouterKeys.PRO_LOGIN, element: <SuspenseWrapper><ProLoginPage /></SuspenseWrapper> },
  { path: RouterKeys.PRO_SIGNUP, element: <SuspenseWrapper><RegisterPage /></SuspenseWrapper> },
  { path: RouterKeys.PRO_FORGOT_PASSWORD, element: <SuspenseWrapper><ProForgotPasswordPage /></SuspenseWrapper> },
];
