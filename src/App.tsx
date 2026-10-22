import { ConfigProvider } from 'antd'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'

import { lightTheme } from './client/default/styles/ThemeConfig'
import myRouter from './config/router/MyRouter'
import { store } from './redux'

export default function App() {
  return (
    <Provider store={store}>
      <ConfigProvider theme={lightTheme}>
        <RouterProvider router={myRouter} />
      </ConfigProvider>
    </Provider>
  )
}
