# Architecture: page → layout → component

## Layers and dependency direction

```
src/pages/<feature>/ + src/hooks/   behaviour   (data, state, handlers, navigation)
        │  builds props
        ▼
src/client/default/<feature>/ markup      (JSX composition only; "default" is the client theme/skin)
        │  composes
        ▼
src/component/                reusable UI (pure, props in / callbacks out)
        │  uses
        ▼
src/common/  src/lib/         shared types, enums, formatters
```

Imports only point **down** this list. A component importing from `pages/` or `client/` is a bug. So is a layout importing from `pages/`.

## Layer rules

### `src/component/` (reusable)
- `ui/`: generic primitives with no Helpio concepts (Chip, StatTile, StepList, FaqList…).
- `marketplace/`: Helpio-domain components that work on any screen (SearchBox, ServiceCard, EarningsCalculator…).
- `layout/`: the app shell (`appLayout.tsx`) and route placeholders. This is the one place allowed to use router and redux, because it *is* the shell.
- Every value is a prop and every action is an `onX` prop.
- **No** `useNavigate`, `useAppSelector`/`useAppDispatch`, RTK Query hooks or API calls.
- Local `useState` is allowed **only** for purely visual state such as expand/collapse or tooltip open. Anything with business meaning (search text, selected skill, slider value, filters, form values, modals that trigger actions) is lifted to the page.
- Props are typed with the shared DTOs from `src/common/CommonDto.ts`.
- Export each component from its folder's `index.ts`.

### `src/client/default/<feature>/` (layout)
- `<feature>.layout.tsx` is the root layout. A big or role-based screen can split into sub-layouts it picks between.
- `<name>.layout.tsx` holds the markup for one view: section order, spacing, headers, and composition of components.
- `<feature>.layout.types.ts` is the contract. Reuse component props with `ComponentProps<typeof X>` so the page and layout can't drift. Wrap with `WithLoading<T>` from `client/default/layout.types.ts` (`{ loading: true } | ({ loading: false } & T)`) so the page doesn't invent placeholder data.
- Static marketing copy and its icons (step lists, benefit bullets, headlines) belong in the layout. Data, values and handlers come from the page.
- No data fetching and no `useState`/`useEffect`.

### `src/pages/<feature>/` (behaviour)
- `<feature>.page.tsx` reads any global state, calls the hooks and renders the layout.
- `src/hooks/use<View>.ts` holds one hook per view. It owns queries, state, debounce, derived values, navigation and handlers, and **returns the layout props**.
- `<feature>.api.ts` injects RTK Query endpoints into `baseApi` (never `createApi` again). Use `queryFn` with mocks until the backend exists.
- `<feature>.mock.ts` holds typed mock data.
- `types/<feature>.dto.ts` holds only feature-specific payloads, composed from `common/CommonDto` entities.
- Navigation always goes through `RouterKeys`, `toPath()` and `withQuery()` from `src/config/router/RouterKeys.ts`.

### Shared (not owned by one page)
- `src/common/CommonApi.ts` holds endpoints used by several screens (e.g. `searchServices`). Pages never import another page's `*.api.ts`.
- `src/common/CommonMock.ts` holds shared catalogue mocks (categories, services).
- `src/lib/` holds framework-free helpers: `formatINR`, `draftJobDescription`. Every custom hook (page hooks and generic ones such as `useDebouncedValue`) lives in `src/hooks/`.

### Public vs post-login screens
- **Landing (`pages/hero`, `/`)** is public. **No role toggle**: one scroll serves customers (search, post a job) and providers (earnings, join).
- Post-login screens (bookings, profile, a future provider area) don't exist yet. When they arrive, role comes from auth state, never from a UI toggle.

## Naming
| Kind | Pattern | Example |
|---|---|---|
| Page | `<feature>.page.tsx` | `hero.page.tsx` |
| Page hook | `src/hooks/use<View>.ts` | `useLanding.ts` |
| Root layout | `<feature>.layout.tsx` | `hero.layout.tsx` |
| Sub-layout (optional) | `<view>.layout.tsx` (camelCase) | `bookingList.layout.tsx` |
| Layout contract | `<feature>.layout.types.ts` | `hero.layout.types.ts` |
| Component | `PascalCase.tsx` | `ServiceCard.tsx` |

## Adding a new screen (step by step)
1. Add the path to `RouterKeys` and a route in `src/config/router/MyRouter.tsx` (child of `AppLayout`).
2. Add entities to `common/CommonDto.ts` and enums to `common/CommonEnum.ts` if they're shared.
3. Add API endpoints in `pages/<feature>/<feature>.api.ts` (mock with `queryFn` if needed).
4. Write `client/default/<feature>/<feature>.layout.types.ts`: one prop group per section.
5. Write the layout(s) by composing catalogue components. If something is missing, build it in `component/ui` or `component/marketplace`, export it, and document it in `components.md`.
6. Write `src/hooks/use<View>.ts` returning the layout props, then a thin `<feature>.page.tsx`.
7. Run the checklist.

## Worked example: landing page
```tsx
// pages/hero/hero.page.tsx: behaviour only
const HeroPage = () => <HeroLayout {...useLanding()} />;

// hooks/useLanding.ts: returns layout props
const monthlyEstimate = Math.round((rate.hourlyAvg * hours * WEEKS_PER_MONTH) / 100) * 100;
earnings: { rates: data.earningRates, skillId: rate.skillId, onSkillChange: setSkillId, hours, onHoursChange: setHours, monthlyEstimate },
onExploreEarning: () => document.getElementById(EARN_SECTION_ID)?.scrollIntoView({ behavior: 'smooth' }),

// client/default/hero/hero.layout.tsx: markup + static copy only
<section id={EARN_SECTION_ID} className="-mx-5 bg-slate-900 px-5 py-6 text-white">
  <EarningsCalculator {...p.earnings} benefits={PROVIDER_BENEFITS} />
  <StepList steps={PROVIDER_STEPS} tone="dark" />
</section>
```

