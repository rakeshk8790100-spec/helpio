/**
 * Auth section router
 *
 * Parent : <AuthLayout />   (header + footer shell)
 * Children (via <Outlet />) :
 *   /auth/login   → LoginPage
 *   /auth/signup  → SignupPage
 */
import { type RouteObject } from 'react-router-dom'
import AuthLayout  from '../../component/layout/AuthLayout'
import LoginPage   from './screens/login/loginPage'
import SignupPage  from './screens/signup/signupPage'
import { AUTH_ROUTES } from './routes'

export const authRoutes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      { path: AUTH_ROUTES.LOGIN,  element: <LoginPage />  },
      { path: AUTH_ROUTES.SIGNUP, element: <SignupPage /> },
    ],
  },
]
