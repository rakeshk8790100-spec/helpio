# Component catalogue

Import from the barrels:
```ts
import { Chip, HScroll, SectionHeader } from '<rel>/component/ui';
import { SearchBox, ServiceCard } from '<rel>/component/marketplace';
```
All components are pure: data comes in through props and actions go out through `onX`.

## `src/component/ui` (generic primitives)

| Component | Purpose | Key props | Use instead of… |
|---|---|---|---|
| `SectionHeader` | Section title + optional "See all" action | `title`, `actionLabel?`, `onAction?` | hand-written section titles |
| `HScroll` | Edge-to-edge horizontal snap carousel | `children` (give children `shrink-0 snap-start` + fixed width) | custom `overflow-x-auto` rows |
| `Chip` | Filter toggle or compact shortcut pill | `active?`, `onClick?`, `icon?`, `tone?: 'light' \| 'dark'`, `children` | inline pill buttons |
| `StepList` | Numbered vertical steps with connector ("how it works", joining steps) | `steps: { title, text, Icon }[]`, `tone?: 'light' \| 'dark'` | hand-made numbered lists |
| `FaqList` | Accessible accordion (native `<details>`) | `items: { q, a }[]` | antd Collapse / custom toggles |
| `StatTile` | Labelled metric | `label`, `value`, `variant: 'plain' \| 'glass'` | ad-hoc stat boxes |
| `StatusBadge` | Status label with tone | `label`, `tone: success \| warning \| error \| neutral \| brand` | coloured spans / antd `Tag` for status |
| `Avatar` | Initials avatar on the brand gradient | `name`, `size: sm \| md \| lg` | coloured initial circles |
| `IconTile` | Icon square + caption for grids | `Icon`, `label`, `onClick?` | category/shortcut tiles |
| `PageSkeleton` | Page-level loading skeleton | none | spinners |

## `src/component/marketplace` (Helpio domain)

| Component | Purpose | Key props |
|---|---|---|
| `SearchBox` | Sticky service search with suggestions + "post a custom job" fallback | `value`, `onChange`, `term`, `results`, `loading`, `onSelect`, `onPostCustom` |
| `ServiceCard` | Bookable service tile (carousel) | `service`, `onBook` |
| `CategoryGrid` | 4-column category grid + optional "More" | `categories`, `onSelect`, `onMore?`, `max?` |
| `PostJobComposer` | Dark CTA card: describe job, AI improve, post | `value`, `onChange`, `onImprove`, `onSubmit`, `improving?` |
| `TrustStrip` | Four-tile trust explainer (escrow, PIN, proof, masked chat); copy works for both sides | `title?` |
| `AudienceCard` | Entry card for one audience on a shared page ("I need help" / "I want to earn") | `Icon`, `eyebrow`, `title`, `highlight`, `ctaLabel`, `onClick`, `tone: 'brand' \| 'dark'` |
| `EarningsCalculator` | Provider earnings estimate: skill chips + hours slider + live total (for dark sections) | `rates`, `skillId`, `onSkillChange`, `hours`, `onHoursChange`, `monthlyEstimate`, `benefits` |
| `TestimonialCard` | Rated quote with a Customer/Provider badge (carousel) | `testimonial` |

## `src/component/layout` (app shell)
| Component | Purpose |
|---|---|
| `AppLayout` | 430px mobile shell: header, scrolling content (`<Outlet/>`), public bottom tabs, Log in button |
| `ComingSoon` | Placeholder for routes not built yet (catch-all child route) |

## Before creating a new component
1. Search this catalogue and `src/component/**`. Extend an existing component with an optional prop rather than forking it.
2. If it has no Helpio concepts, it goes in `ui/`. If it does but works on any screen, it goes in `marketplace/`. If it's used by one screen only, keep it as markup in that screen's layout.
3. Keep it pure (see architecture.md), type props with `common/CommonDto`, export it from the folder's `index.ts`, and add a row here.

## Removed (restore from git history if a future screen needs them)
The earlier customer/provider dashboard used `ProgressBar`, `Stepper`, `AlertBanner`, `EmptyState`, and job/quote/provider cards (active-job cards, milestone progress, approx map, earnings, onboarding). They were deleted with the dashboard. Rebuild them pure, following these rules, when a screen needs them.
