import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'

const { Content } = Layout

export function AppLayout() {
  return (
    <Layout className="flex min-h-dvh w-full items-center justify-center !bg-[#e5e7eb]">
      <Layout className="min-h-dvh w-full max-w-[390px] overflow-hidden !bg-white shadow-xl lg:my-6 lg:h-[min(844px,calc(100dvh-48px))] lg:min-h-0 lg:rounded-[28px]">
        <Content className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
