import { Layout } from 'antd';
import { HelpioLogo, UserMenu } from '@/components/common';
import type { MainLayoutProps } from '@/pages/main/types/main.dto';

const { Header, Content, Footer } = Layout;

/** 430px mobile shell: header with the logo and account, the page, and role-based bottom tabs. */
const MainLayout = (p: MainLayoutProps) => (
  <div className="min-h-dvh w-full bg-slate-100 sm:flex sm:justify-center">
    <Layout className="!h-dvh !w-full !max-w-[430px] !overflow-hidden !bg-white sm:border-x sm:border-slate-200">
      <Header className="!flex !h-16 !shrink-0 !items-center !justify-between !border-b !border-slate-100 !bg-white !px-5 !leading-normal">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            p.onHome();
          }}
          className="rounded-lg active:scale-95"
        >
          <HelpioLogo />
        </a>

        {p.user ? (
          <div className="flex items-center gap-1">
            {p.bell}
            <UserMenu user={p.user} onLogout={p.onLogout} />
          </div>
        ) : (
          p.onLogin && (
            <button
              type="button"
              onClick={p.onLogin}
              className="flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white active:scale-95"
            >
              Log in
            </button>
          )
        )}
      </Header>
      {p.overlays}

      <Content className="!min-h-0 !flex-1 !overflow-y-auto !bg-white !px-5 !py-5">{p.content}</Content>

      <Footer hidden={!p.tabs} className="!shrink-0 !border-t !border-slate-200 !bg-white !p-0">
        <nav aria-label="Bottom navigation" className={p.tabs?.length === 5 ? 'grid grid-cols-5' : 'grid grid-cols-4'}>
          {p.tabs?.map(({ label, path, Icon, active, onSelect }) => (
            <a
              key={path}
              href={path}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                onSelect();
              }}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-xs ${
                active ? '!text-indigo-600' : '!text-slate-500'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
              <span className={active ? 'font-semibold' : ''}>{label}</span>
            </a>
          ))}
        </nav>
      </Footer>
    </Layout>
  </div>
);

export default MainLayout;
