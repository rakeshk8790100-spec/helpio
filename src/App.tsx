import { ConfigProvider } from 'antd'
import {
  RouterProvider,
} from 'react-router-dom'

import { lightTheme }  from './client/default/styles/themeConfig'
import myRouter from './config/router/MyRouter'
 


export default function App() {
  return (
    <ConfigProvider theme={lightTheme}>
      <RouterProvider router={myRouter} />
    </ConfigProvider>
  )
}
