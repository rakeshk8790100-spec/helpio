# Helpio design system

Source of truth: `src/client/default/styles/ThemeConfig.tsx` (antd tokens, `BRAND`) and `src/client/default/styles/style.scss` (CSS variables, mixins). Use Tailwind utilities that map onto these values. Never introduce new hex colours.

## Personality
Trustworthy, calm, fast. One clear primary action per card. Money, safety and progress are always visible and explained in plain words.

## Colour
| Role | Tailwind | Use |
|---|---|---|
| Primary | `indigo-600` (actions), `indigo-500` (fills), `indigo-50` (tints) | buttons, active states, progress |
| Secondary | `violet-500` / `violet-50` | AI/"why" hints, gradient end |
| Brand gradient | `bg-linear-to-br from-indigo-500 to-violet-500` + `shadow-lg shadow-indigo-500/25` | **only** hero cards (active job, wallet) and antd primary buttons (already styled in SCSS). Max one or two per screen |
| Success | `emerald-500/600`, `emerald-50` | approved, accepted, online |
| Warning | `amber-400/500`, `amber-50` | pending, awaiting approval, in review |
| Error / urgent | `red-500/600`, `red-50` | urgent, rejected, emergency, safety |
| Info | `sky-*` | neutral notices |
| Text | `slate-900` headings · `slate-700` body · `slate-500` meta · `slate-400` hints |  |
| Surfaces | `white` cards · `slate-50` inner blocks/inputs · `slate-100` borders · `slate-900` dark CTA card |  |

Status always pairs colour with a text label (`StatusBadge`), never colour alone.

## Layout (mobile shell)
- The app shell (`component/layout/appLayout.tsx`) is a column at most 430px wide, with a 64px header, 64px bottom tabs and a scrolling content area that has `px-5 py-5`.
- Page root: `flex flex-col gap-6` between sections.
- Section: `SectionHeader` and then content (`mb-3` is built in).
- Carousels: `HScroll` (bleeds edge-to-edge with `-mx-5 px-5`, snap). Card widths: `w-32` (provider), `w-44` (service), `w-56` (draft).
- Sticky inside content: `sticky -top-5` (offsets the content padding) with `bg-white`.
- Grids: 4 columns for icon tiles, 3 for stat tiles, 2 for paired actions.
- Must work from 360px to 430px with no horizontal page scroll (only carousels scroll).

## Typography (Inter)
| Token | Classes |
|---|---|
| Page greeting | `text-xl font-bold text-slate-900` |
| Card title | `text-base`/`text-lg font-semibold` |
| Section title | `text-base font-semibold text-slate-900` (via `SectionHeader`) |
| Body | `text-sm text-slate-700/800` |
| Meta | `text-xs text-slate-500` |
| Caption | `text-[11px]` |
| Micro / eyebrow | `text-[10px]`, or `text-[11px] font-semibold uppercase tracking-wider` |
| Money | `font-bold`, formatted with `formatINR()` from `src/lib/utils.ts` |
| PIN / codes | `font-mono tracking-[0.3em]` |

## Shape and depth
- Cards use `rounded-2xl`, inner blocks and buttons `rounded-xl`/`rounded-lg`, chips and badges `rounded-full`.
- Cards are `border border-slate-100 bg-white shadow-sm`. Only gradient cards get a coloured shadow.
- Selected or highlighted cards add `border-indigo-400 ring-2 ring-indigo-100`.

## Motion and interaction
- Pressable surfaces get `active:scale-[.98]` (cards) or `active:scale-95` (small buttons and tiles).
- "Awaiting" or "next" states use `animate-pulse` (milestone awaiting approval, next stepper step).
- `transition` on state changes. Keep durations to the theme tokens (0.15s, 0.25s, 0.4s).
- Disabled actions stay visible with a reason: `disabled:bg-slate-200 disabled:text-slate-500`, a lock icon and a tooltip or hint text.

## States (every data section)
| State | Pattern |
|---|---|
| Loading | `PageSkeleton` for the page, antd `Skeleton` for a section |
| Empty | An icon and one helpful line (add a `ui/EmptyState` when first needed); hide optional sections entirely |
| Error | An inline error notice with a retry action (add a `ui/AlertBanner` when first needed) |
| Data | the normal layout |

## Landing and marketing copy
- One page serves both audiences, with no "who are you?" toggle. Every section speaks to customers, providers or both.
- **Customer value is speed and ease:** "quotes in minutes", "done today", "pay only for approved work". Lead with search.
- **Provider value is earnings and control:** concrete ₹ figures, "choose your jobs", "work near home", "weekly payouts", "payment secured in escrow".
- Trust content is written for both sides: escrow protects customers *and* guarantees provider payment.
- Give both audiences a path in the first screenful (`AudienceCard` pair), then a dedicated section each further down.
- Provider sections use the dark surface (`bg-slate-900`) with amber accents (`amber-300/400`) so they read as a distinct "for professionals" zone. Customer surfaces stay indigo.
- Every section ends in one clear action. Repeat the main CTAs at the bottom of the page.

## Marketplace rules
- **Privacy before hire:** distances use `~`, map areas are fuzzed circles, and customers show as "Customer A.". Exact address and phone are never shown before hire.
- **Trust visibility:** escrow, start PIN, 25/50/75/100% proof and masked chat are explained where they matter (`TrustStrip` on the landing page).
- **Gated actions:** quoting stays locked until verification is approved, and the provider can't start until escrow is funded. Always show why something is locked.
- **Safety:** an active-job surface always offers Safety (red).

## Admin console (desktop)
The admin console (`/admin/*`) is the one desktop surface. It keeps the palette, type and tokens above, with denser data.
- **Shell:** `AdminLayout` (white 240px sidebar, `bg-slate-50` page, content `max-w-[1440px]` with `px-8 py-6`). Below `lg` it shows "Open the admin console on a computer" instead.
- **Page:** `PageHeader` (`text-2xl font-bold` title, one-line description, actions on the right), then content. One page per sidebar section.
- **Data:** antd `Table` inside `rounded-2xl border border-slate-100 bg-white shadow-sm`, server-side pages (`?page=` in the URL), filters in the header's actions. Status is a `StatusBadge`, never colour alone.
- **Actions:** small buttons in the last column; destructive ones are `danger` and ask for a reason in a `Modal` (required when the person affected is told why). One primary per row.
- **Log-in pages** (`/admin/login`, `/admin/request-access`) sit outside the shell in a centred `max-w-md` card and reuse the auth fields and `EmailCodeStep`.
- **No gradients** in the console: it's a tool, not a marketing surface.

## Accessibility
- Every clickable element is a `<button type="button">` or a link, and icon-only buttons need an `aria-label`.
- Tap targets are at least 40px (`h-10`) for primary actions.
- Toggles use `aria-pressed`, expanders `aria-expanded`, progress `role="progressbar"`, alerts `role="alert"|"status"`.
- Text contrast must meet AA. Don't put `slate-400` text on `slate-50` for anything important.

## Gotchas (this codebase)
- `style.scss` is **unlayered** CSS, so it beats Tailwind's layered utilities. It sets margins, sizes and colours on `p`, `h1`–`h6` and `a`. Use `div`/`span` with utilities for styled text.
- Tailwind v4 syntax: `bg-linear-to-br` (not `bg-gradient-to-br`), and important is written `!` (the codebase uses the prefix form `!bg-white`).
- `erasableSyntaxOnly`: no TS `enum`, so use `as const` objects plus a derived union (see `common/CommonEnum.ts`).
- lucide-react v1 uses canonical names only (`CircleCheck`, not `CheckCircle2`). Import `Map as MapIcon` so the global `Map` isn't shadowed.
- antd static `message`/`Modal.confirm` don't receive theme context. Render `<Modal>` declaratively.
