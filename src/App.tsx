import { ConfigProvider } from 'antd'
import {
  RouterProvider,
} from 'react-router-dom'

import { lightTheme }  from './client/default/styles/themeConfig'
import router from './common/myRouter'


export default function App() {
  return (
    <ConfigProvider theme={lightTheme}>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}
