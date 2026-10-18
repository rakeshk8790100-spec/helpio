import { ConfigProvider } from 'antd'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'

import { lightTheme }  from './client/default/styles/themeConfig'
import { AppLayout }   from './component/layout'
import { authRoutes }  from './pages/auth/auth'

// ── Router ────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    element: <AppLayout />,          // root shell — mobile canvas
    children: [
      // Default redirect → login
    
    ],
  },
])

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  return (
    <ConfigProvider theme={lightTheme}>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}
