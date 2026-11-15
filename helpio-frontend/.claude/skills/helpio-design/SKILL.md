---
name: helpio-design
description: Use when building or changing any Helpio frontend screen, layout or component (UI, page, design, styling, Tailwind/antd). Enforces the pages (logic) → clients (UI) → components architecture, the Helpio design system, reuse of src/components, and the review checklist.
---

# Helpio design & UI architecture

Helpio is a mobile-first, two-sided services marketplace (customers ↔ providers) built with React 19, antd 6, Tailwind 4, lucide-react and RTK Query. Every screen must look like part of one product and follow one structure.

## Workflow (follow in order)

1. **Understand the screen.** Write down the user's next action, the data each section needs, and the loading, empty and error states. Order sections by urgency: live task → pending decisions → in-progress items → discovery.
2. **Reuse before creating.** Read [references/components.md](references/components.md). Compose from the existing `src/components/ui` and `src/components/common` components. Only create a component when nothing fits, then add it to the barrel `index.ts` and to the catalogue.
3. **Build in three layers.** Follow [references/architecture.md](references/architecture.md):
   - `src/components/**`: pure presentational components. Props come in, `onX` callbacks go out.
   - `src/clients/default/<module>/screens/<feature>/<feature>Layout.tsx` (or `<feature>Form.tsx`): all markup for the screen, registered lazily in `src/clients/index.ts`.
   - `src/pages/<module>/screens/<feature>/<feature>.page.tsx`: all logic (data, state, navigation), rendering the layout from `@/clients` inside `SuspenseWrapper`. Only hooks shared by 2+ screens go in `src/hooks/`.
4. **Apply the design system.** Follow [references/design-system.md](references/design-system.md) for colour, spacing, type, shape, motion, states, privacy, accessibility and the CSS gotchas.
5. **Run the checklist.** Work through [references/checklist.md](references/checklist.md) before saying the work is done, including `npm run lint` and `npm run build`.

## Non-negotiables

- Components never import `react-router-dom`, `redux`, `*.api.ts` or anything from `src/pages` (only `components/wrapper` may use the router and redux).
- Layouts never fetch data, hold state or use the router. They receive one typed props object from the screen's `types/<feature>.dto.ts`.
- Backend URLs come from `APIS` in `config/base_service/http.config.ts`; labels and badges from `common/CommonLabels.ts`.
- Shared types live in `src/common/CommonDto.ts`. Shared enums live in `src/common/CommonEnum.ts`, written as `as const` objects; TS `enum` is not allowed (`erasableSyntaxOnly`).
- Use Tailwind utilities with the brand palette. No new hex colours. Use real headings (`h1`–`h3`) for page and section titles; Tailwind classes on them win over the global defaults.
- Every data section handles loading, empty, error and data.
- Before hire, customer identity and exact location are always masked.

## Worked example

- **Public landing (`/`), one layout for both audiences:** `src/pages/hero/screens/hero/hero.page.tsx` (logic, with `types/hero.dto.ts`) and `src/clients/default/hero/screens/hero/heroLayout.tsx` (markup).
- **A form screen:** `src/pages/jobs/screens/postJob/` (`postJob.page.tsx`, `postJob.api.ts`, `postJob.helpers.ts`, `types/`) with `src/clients/default/jobs/screens/postJob/postJobForm.tsx`.
- **An admin table:** `src/pages/admin/screens/users/` (`users.page.tsx`, `users.colDef.tsx`) with `src/clients/default/admin/screens/users/usersLayout.tsx`.
