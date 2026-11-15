# Architecture: pages (logic) → clients (UI) → components

Every screen is split into two files in two folders, so the same logic can be shown with a different UI per client:

| Folder | Holds | Example |
|---|---|---|
| `src/pages/<module>/screens/<feature>/` | **Logic**: queries, state, handlers, navigation, table columns, types | `pages/jobs/screens/jobDetail/jobDetail.page.tsx` |
| `src/clients/<client>/<module>/screens/<feature>/` | **UI only**: JSX that receives one props object | `clients/default/jobs/screens/jobDetail/jobDetailLayout.tsx` |

The `@client` alias points at `src/clients/<VITE_ORG_NAME>` (default `default`; see `vite.config.ts`). A client folder needs only the layouts it changes; everything in `clients/index.ts` must exist in the active client.

## How a page finds its layout
1. The layout is registered lazily in `src/clients/index.ts`:
   `export const JobDetailLayout = lazy(() => import('@client/jobs/screens/jobDetail/jobDetailLayout'));`
2. The page imports it from `@/clients` and renders it inside `<SuspenseWrapper>` with one props object:
   ```tsx
   const JobDetail = ({ id }: { id: string }) => (
     <SuspenseWrapper>
       <JobDetailLayout {...useJobDetail(id)} />
     </SuspenseWrapper>
   );
   ```
3. The page's logic lives in the same file (`useJobDetail` above is a local function, not in `src/hooks`). It returns the layout's props.

The two app shells are imported directly (not lazily), since they wrap every page: `pages/main/MainPage.tsx` with `@client/main/mainLayout`, and `pages/admin/AdminPage.tsx` with `@client/admin/adminShellLayout`.

## Dependency direction
```
src/pages/      logic           → may import clients (registry), components, hooks, common, config, lib, redux
src/clients/    UI only         → may import components, common, lib, and types/enums from pages
src/components/ reusable UI     → may import common, lib (wrapper/ may also use router and redux)
src/common/ src/lib/ src/config/  shared types, labels, helpers, API setup
```
- **Layouts** (`clients/`) never use hooks, state, effects, queries, or the router; navigation and outlets come in as props (`onSelect`, `content`).
- **Components** (`components/ui`, `components/common`, `components/admin`) never import `react-router-dom`, redux, `*.api.ts` or `pages/`. Only `components/wrapper` (SuspenseWrapper, AuthWrapper) may.

## A module (`src/pages/<module>/`)
```
<module>/
├── index.ts                 # lazy() exports of the module's pages
├── route.tsx                # the module's routes (composed by config/router/MyRouter.tsx)
├── <Module>Page.tsx         # only when the module has its own shell (admin: AdminPage)
├── <module>.api.ts          # endpoints used by 2+ screens of the module (or by other modules)
├── <module>.helpers.ts      # pure helpers shared by the module's screens (optional)
├── types/<module>.dto.ts    # types shared by 2+ screens: API wire shapes and shared layout props
└── screens/<feature>/
    ├── <feature>.page.tsx       # logic + the page component
    ├── <feature>.api.ts         # endpoints only this screen uses
    ├── <feature>.colDef.tsx     # table columns (admin), passed to the layout as props
    ├── <feature>.helpers.ts     # pure helpers for a big screen (e.g. postJob's date maths)
    ├── form/add<Entity>Form.tsx # a form's logic when it's a part of the screen (e.g. the address sheet)
    └── types/
        ├── <feature>.dto.ts     # the screen's API wire shapes and layout props
        └── <feature>.enum.ts    # fixed values as `as const` objects (TS `enum` is blocked by tsconfig)
```

## Where does my new code go?
| I need to add… | Put it in |
|---|---|
| A new screen | `pages/<module>/screens/<feature>/` + `clients/default/<module>/screens/<feature>/<feature>Layout.tsx`; register the layout in `clients/index.ts`; export the page from the module's `index.ts`; add the route in the module's `route.tsx` |
| A backend URL | `APIS` in `config/base_service/http.config.ts`; fill `{{params}}` with `replaceUrlPlaceholders` |
| An API call | The screen's `<feature>.api.ts` if only it uses it; the module's `<module>.api.ts` if several screens do; `common/CommonApi.ts` for app-wide basics (session, catalog, saved addresses). Always `baseApi.injectEndpoints`, with cache tags from `TAG_TYPES` (`one('Jobs', id)` / `list('Jobs')`) |
| A type or enum for one screen | `screens/<feature>/types/` |
| A type used across modules | `common/CommonDto.ts` / `common/CommonEnum.ts` |
| A label, badge or status text | `common/CommonLabels.ts` (so every screen says it the same way) |
| A hook used by 2+ screens | `src/hooks/`. A hook used once lives in its page file or beside it (`<feature>.<kind>.ts`) |
| A reusable component | `components/ui` (no Helpio concepts) or `components/common` (Helpio domain); export it from the folder's `index.ts` and add it to `components.md` |
| Photo or file rules | `lib/media.ts` |
| A polling or live query | `poll(ms)` / `LIVE` from `config/base_service/base.api.ts`, so hidden tabs don't poll |

Check `common/`, `components/` and `lib/` before creating anything new.

## Naming
| Thing | Pattern | Example |
|---|---|---|
| Module / feature folder | camelCase | `jobs`, `jobDetail` |
| Logic files | `<feature>.<kind>.ts(x)` | `jobDetail.page.tsx`, `jobDetail.api.ts`, `users.colDef.tsx` |
| Layout / form UI | `<feature>Layout.tsx`, `<feature>Form.tsx` | `jobDetailLayout.tsx`, `postJobForm.tsx` |
| UI parts shared by a module's screens | `clients/default/<module>/shared/` | `shared/jobProgress.tsx` |
| Components | `PascalCase.tsx` | `QuoteCard.tsx` |
| Props types | `<Feature>LayoutProps`; with table columns, `<Feature>Props` (built by the page) + `<Feature>LayoutProps` (adds `columns`) | `UsersProps`, `UsersLayoutProps` |

Interfaces have no `I` prefix; enums are `as const` objects with a type of the same name.

## Shared conventions
- Imports use `@/…` (and `@client/…` in the registry); only files inside the importer's own folder use `./…`.
- Screen states use `WithStatus<T>` (`loading` / `error` with Retry / `ready`) from `CommonDto`; `toStatus(query, build)` in `lib/utils.ts` builds it from a query.
- Navigation goes through `RouterKeys`, `toPath()` and `withQuery()`.
- Fire-and-forget promises are marked `void` (lint enforces it).
