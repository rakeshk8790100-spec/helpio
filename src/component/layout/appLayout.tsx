import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'

const { Content } = Layout

const AppLayout = () => {
  return (
    <Layout className="min-h-full !bg-white">
      <header className="flex items-center px-6 py-5">
        <span className="text-xl font-semibold tracking-tight text-slate-900">
          helpio
        </span>
      </header>

      <Content className="flex flex-1 flex-col px-6 pb-8">
        <Outlet />
      </Content>

      <footer className="px-6 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Helpio
      </footer>
    </Layout>
  )
}


export default  AppLayout