import { lazy } from 'react';

export const LoginPage = lazy(() => import('@/pages/auth/screens/login/login.page'));
export const ProLoginPage = lazy(() => import('@/pages/auth/screens/proLogin/proLogin.page'));
export const SignupPage = lazy(() => import('@/pages/auth/screens/signup/signup.page'));
export const RegisterPage = lazy(() => import('@/pages/auth/screens/register/register.page'));
export const CustomerForgotPasswordPage = lazy(() =>
  import('@/pages/auth/screens/forgotPassword/forgotPassword.page').then((m) => ({ default: m.CustomerForgotPasswordPage })),
);
export const ProForgotPasswordPage = lazy(() =>
  import('@/pages/auth/screens/forgotPassword/forgotPassword.page').then((m) => ({ default: m.ProForgotPasswordPage })),
);
/** The header's log-in popup */
export const LoginModalPage = lazy(() => import('@/pages/auth/screens/loginModal/loginModal.page'));
