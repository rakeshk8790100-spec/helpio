import { App as AntApp, ConfigProvider } from 'antd'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'

import { lightTheme } from './client/default/styles/ThemeConfig'
import myRouter from './config/router/MyRouter'
import { store } from './redux'

export default function App() {
  return (
    <Provider store={store}>
      <ConfigProvider theme={lightTheme}>
        {/* AntApp provides theme-aware message/notification via App.useApp() */}
        <AntApp>
          <RouterProvider router={myRouter} />
        </AntApp>
      </ConfigProvider>
    </Provider>
  )
}
