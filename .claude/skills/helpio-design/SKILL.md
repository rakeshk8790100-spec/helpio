---
name: helpio-design
description: Use when building or changing any Helpio frontend screen, layout or component (UI, page, design, styling, Tailwind/antd). Enforces the page → layout → component architecture, the Helpio design system, reuse of src/component, and the review checklist.
---

# Helpio design & UI architecture

Helpio is a mobile-first, two-sided services marketplace (customers ↔ providers) built with React 19, antd 6, Tailwind 4, lucide-react and RTK Query. Every screen must look like part of one product and follow one structure.

## Workflow (follow in order)

1. **Understand the screen.** Write down the user's next action, the data each section needs, and the loading, empty and error states. Order sections by urgency: live task → pending decisions → in-progress items → discovery.
2. **Reuse before creating.** Read [references/components.md](references/components.md). Compose from the existing `src/component/ui` and `src/component/marketplace` components. Only create a component when nothing fits, then add it to the barrel `index.ts` and to the catalogue.
3. **Build in three layers.** Follow [references/architecture.md](references/architecture.md):
   - `src/component/**`: pure presentational components. Props come in, `onX` callbacks go out.
   - `src/client/default/<feature>/*.layout.tsx`: all markup for the screen.
   - `src/pages/<feature>/*.page.tsx` and `hooks/useX.ts`: all behaviour (data, state, navigation).
4. **Apply the design system.** Follow [references/design-system.md](references/design-system.md) for colour, spacing, type, shape, motion, states, privacy, accessibility and the CSS gotchas.
5. **Run the checklist.** Work through [references/checklist.md](references/checklist.md) before saying the work is done, including `npm run lint` and `npm run build`.

## Non-negotiables

- Components never import `react-router-dom`, `redux`, `*.api.ts` or anything from `src/pages`.
- Layouts never fetch data or hold state. They receive one typed props object from `<feature>.layout.types.ts`.
- Shared types live in `src/common/CommonDto.ts`. Shared enums live in `src/common/CommonEnum.ts`, written as `as const` objects; TS `enum` is not allowed (`erasableSyntaxOnly`).
- Use Tailwind utilities with the brand palette. No new hex colours, and no `p` or `h1`–`h6` tags for styled text (the global SCSS overrides them).
- Every data section handles loading, empty, error and data.
- Before hire, customer identity and exact location are always masked.

## Worked example

- **Public landing (`/`), one layout for both audiences:** `src/pages/hero/hero.page.tsx` with `hooks/useLanding.ts`, and `src/client/default/hero/hero.layout.tsx` with `hero.layout.types.ts`.
