import type { RouteObject } from 'react-router-dom';
import { RouterKeys } from '../../config/router/RouterKeys';
import { CustomerForgotPasswordPage, ProForgotPasswordPage } from './screens/forgotPassword/forgotPassword.page';
import LoginPage from './screens/login/login.page';
import ProLoginPage from './screens/proLogin/proLogin.page';
import RegisterPage from './screens/register/register.page';
import SignupPage from './screens/signup/signup.page';

/** Public auth routes, spread into the app router as children of AppLayout. Customers and providers each get their own pages. */
export const authRoutes: RouteObject[] = [
  { path: RouterKeys.LOGIN, Component: LoginPage },
  { path: RouterKeys.SIGNUP, Component: SignupPage },
  { path: RouterKeys.FORGOT_PASSWORD, Component: CustomerForgotPasswordPage },
  { path: RouterKeys.PRO_LOGIN, Component: ProLoginPage },
  { path: RouterKeys.PRO_SIGNUP, Component: RegisterPage },
  { path: RouterKeys.PRO_FORGOT_PASSWORD, Component: ProForgotPasswordPage },
];
