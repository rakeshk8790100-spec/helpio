# Helpio Web (React + Vite)

Customers post home-service jobs and hire nearby pros; pros quote, work in four photo-checked stages and get paid. Admins run it from a desktop console.

**Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, antd 6, Redux Toolkit with RTK Query, react-router 7, Leaflet.

## Getting started

```bash
npm install
npm run dev      # dev server; /api is proxied to the backend (VITE_API_PROXY_TARGET, default http://127.0.0.1:8000)
npm run lint     # ESLint (type-aware promise rules on)
npm run build    # type-check + production build into dist/ (not committed)
```

Copy `.env.example` to `.env.local` and fill it in. `VITE_ORG_NAME` picks which client's screens are built (`default` unless set).

## The one idea: pages vs clients

Every screen is two files in two folders:

| Folder | Holds | Example |
|---|---|---|
| `src/pages/` | **Logic**: queries, state, handlers, navigation, table columns, types | `src/pages/jobs/screens/jobDetail/jobDetail.page.tsx` |
| `src/clients/<client>/` | **UI only**: JSX that receives one props object | `src/clients/default/jobs/screens/jobDetail/jobDetailLayout.tsx` |

Layouts are registered with `lazy()` in `src/clients/index.ts` through the `@client` alias (`src/clients/<VITE_ORG_NAME>`). A page imports its layout from `@/clients` and renders it inside `<SuspenseWrapper>`. Layouts never use hooks, call APIs or use the router.

## Folder structure

```
src/
├── main.tsx, App.tsx      # entry: store, router, antd theme
├── clients/               # UI layouts per client (default/), lazy registry in index.ts, styles/
├── components/            # reusable UI: ui/ (generic), common/ (Helpio domain), admin/, wrapper/ (Suspense, Auth)
├── pages/<module>/        # logic: index.ts (lazy pages), route.tsx, <module>.api.ts, types/, screens/<feature>/
├── hooks/                 # hooks used by 2+ screens only
├── common/                # CommonDto, CommonEnum, CommonApi, CommonLabels, JobDisplay
├── config/                # base_service (base.api, http.config with APIS), router (MyRouter, RouterKeys), env.config
├── lib/                   # utils (formatters, toStatus, replaceUrlPlaceholders), apiError, media
├── redux/                 # store and the auth slice
└── types/                 # global type declarations
```

Modules: `admin`, `auth`, `customer`, `earnings`, `hero` (landing), `home`, `jobs`, `main` (app shell), `notifications`, `onboarding`, `profile`, `pros`.

## Where does my new code go?

| I need to add… | Put it in |
|---|---|
| A new screen | `src/pages/<module>/screens/<feature>/` + `src/clients/default/<module>/screens/<feature>/<feature>Layout.tsx`; register the layout in `src/clients/index.ts`, export the page from the module's `index.ts`, add the route to its `route.tsx` |
| A backend URL | `APIS` in `src/config/base_service/http.config.ts` |
| An API call | The screen's `<feature>.api.ts`; the module's `<module>.api.ts` when several screens use it; `common/CommonApi.ts` for app-wide basics |
| A type or enum for one screen | `screens/<feature>/types/<feature>.dto.ts` / `<feature>.enum.ts` |
| A type used across modules | `src/common/CommonDto.ts` / `CommonEnum.ts` |
| A label or status badge | `src/common/CommonLabels.ts` |
| A hook used in 2+ places | `src/hooks/` |
| A reusable component | `src/components/ui` or `src/components/common` (+ the catalogue in `.claude/skills/helpio-design/references/components.md`) |

The full rules (naming, layout contracts, design system, review checklist) are in `.claude/skills/helpio-design/`.

## Naming at a glance

| Thing | Pattern | Example |
|---|---|---|
| Feature folder | camelCase | `jobDetail`, `postJob` |
| Logic files | `<feature>.<kind>.ts(x)` | `jobDetail.page.tsx`, `jobDetail.api.ts`, `users.colDef.tsx` |
| Layout files | `<feature>Layout.tsx`, `<feature>Form.tsx` | `jobDetailLayout.tsx`, `postJobForm.tsx` |
| Enums | `as const` objects (TS `enum` is blocked by tsconfig) | `JobStatus` |
