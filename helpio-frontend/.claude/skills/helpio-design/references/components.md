# Component catalogue

Import from the barrels:
```ts
import { Chip, HScroll, SectionHeader } from '@/components/ui';
import { SearchBox, ServiceCard } from '@/components/common';
```
All components are pure: data comes in through props and actions go out through `onX`.

## `src/components/ui` (generic primitives)

| Component | Purpose | Key props | Use instead of… |
|---|---|---|---|
| `SectionHeader` | Section title + optional "See all" action | `title`, `actionLabel?`, `onAction?` | hand-written section titles |
| `HScroll` | Edge-to-edge horizontal snap carousel | `children` (give children `shrink-0 snap-start` + fixed width) | custom `overflow-x-auto` rows |
| `Chip` | Filter toggle or compact shortcut pill | `active?`, `onClick?`, `icon?`, `tone?: 'light' \| 'dark'`, `children` | inline pill buttons |
| `StepList` | Numbered vertical steps with connector ("how it works", joining steps) | `steps: { title, text, Icon }[]`, `tone?: 'light' \| 'dark'` | hand-made numbered lists |
| `FaqList` | Accessible accordion (native `<details>`) | `items: { q, a }[]` | antd Collapse / custom toggles |
| `StatTile` | Labelled metric | `label`, `value`, `variant: 'plain' \| 'glass'` | ad-hoc stat boxes |
| `StatusBadge` | Status label with tone | `label`, `tone: success \| warning \| error \| neutral \| brand` | coloured spans / antd `Tag` for status |
| `Avatar` | Profile photo, or initials on the brand gradient | `name`, `src?`, `size: sm \| md \| lg \| xl` | coloured initial circles, raw `<img>` avatars |
| `AvatarUpload` | Large avatar with camera badge; tap to pick a new photo | `name`, `src`, `uploading`, `onPick(file)` | custom photo pickers |
| `MenuRow` | Settings row: icon tile, label, hint, chevron or trailing badge (stack in a rounded card) | `Icon`, `label`, `hint?`, `onClick?`, `trailing?`, `tone?: 'default' \| 'danger'`, `disabled?` | hand-made list rows |
| `IconTile` | Icon square + caption for grids | `Icon`, `label`, `onClick?` | category/shortcut tiles |
| `PageSkeleton` | Page-level loading skeleton | none | spinners |
| `ChipMultiSelect` | Multi-select chip group; works inside antd `Form.Item` | `options: { value, label }[]`, `value?`, `onChange?`, `ariaLabel` | checkbox groups for days/tags |
| `ChipSelect` | Single-choice chip group that wraps (e.g. service radius); works inside `Form.Item`. `allowClear` lets a second tap clear an optional choice; an option with `disabled` shows but can't be picked (e.g. a passed time slot) | `options`, `value?`, `onChange?`, `ariaLabel`, `allowClear?` | `Segmented` with too many options for 360px |
| `StepProgress` | Segmented "Step N of M" bar for multi-screen flows | `steps: string[]`, `current` (1-based) | ad-hoc progress bars |
| `GoogleButton` | Official Google Identity Services button | `clientId`, `onCredential(idToken)` | custom Google buttons |
| `ProgressBar` | Thin progress bar with `role="progressbar"` (milestones 0/25/50/75/100) | `value`, `label`, `variant?: 'plain' \| 'glass'` | ad-hoc width bars |
| `EmptyState` | Empty section: icon, one line, optional action | `Icon`, `text`, `actionLabel?`, `onAction?` | blank sections |
| `AlertBanner` | Inline error notice with Retry (`role="alert"`) | `message`, `onRetry?` | antd `Alert` for failed requests |
| `RatingStars` | Read-only rating: five stars, or `compact` "★ 4.6 (12)" for cards and rows (`role="img"` with a spoken label) | `value`, `count?`, `variant?: 'stars' \| 'compact'`, `size?` | hand-drawn star rows; antd `Rate` is only for picking a rating |

## `src/components/common` (Helpio domain)

| Component | Purpose | Key props |
|---|---|---|
| `SearchBox` | Sticky service search with suggestions + "post a custom job" fallback | `value`, `onChange`, `term`, `results`, `loading`, `onSelect`, `onPostCustom` |
| `ServiceCard` | Bookable service tile (carousel) | `service`, `onBook` |
| `CategoryGrid` | 4-column category grid + optional "More" | `categories`, `onSelect`, `onMore?`, `max?` |
| `PostJobComposer` | Dark CTA card: describe a job in your own words, then Continue (Enter works too) to the post form, which fills itself in from it | `value`, `onChange`, `onSubmit`, `title?`, `hint?` |
| `TrustStrip` | Four-tile trust explainer (pay for approved work, PIN, proof, masked chat); copy works for both sides | `title?` |
| `AudienceCard` | Entry card for one audience on a shared page ("I need help" / "I want to earn") | `Icon`, `eyebrow`, `title`, `highlight`, `ctaLabel`, `onClick`, `tone: 'brand' \| 'dark'` |
| `EarningsCalculator` | Provider earnings estimate: skill chips + hours slider + live total (for dark sections) | `rates`, `skillId`, `onSkillChange`, `hours`, `onHoursChange`, `monthlyEstimate`, `benefits` |
| `TestimonialCard` | Rated quote with a Customer/Provider badge (carousel) | `testimonial` |
| `HelpioLogo` | Brand mark + "helpio" wordmark (header) | `size?: 'sm' \| 'md'` |
| `SkillPicker` | Provider skills: search across the catalogue, category chips (icon + picked count), "Select all" per category, level (with a plain-language hint) and years per picked skill | see the component's props |
| `categoryIcon(key)` | Catalogue category `icon` key → lucide icon (fallback `LayoutGrid`); used by `CategoryGrid` and `SkillPicker`. Add new keys in `categoryIcons.ts` | `key` |
| `UserMenu` | Signed-in header avatar with account details and Log out | `user`, `onLogout` |
| `ActiveJobCard` | Gradient card for the hired job in progress: status, progress, next step, action, red Safety | `eyebrow`, `title`, `statusLabel`, `progressPct`, `nextStep`, `actionLabel`, `onAction`, `onSafety` |
| `JobCard` | A customer's job in a list: status badge, meta line, amount on the right | `title`, `meta`, `badge`, `amount?`, `amountLabel?`, `urgent?`, `onClick` |
| `NearbyJobCard` | Provider view of a job before hire: ~distance, area, "Asha K.", budget, my quote status | `job: NearbyJob`, `onOpen` |
| `ChecklistCard` | Dark provider checklist (done/pending/coming soon) with a locked-action note and one CTA | `title`, `items`, `lockedNote?`, `actionLabel?`, `onAction?` |
| `CurrentLocationButton` | "Use my current location", or "added" with Remove; geolocation errors suggest the pincode (pair with `useCurrentLocation`) | `coordinates`, `locating`, `error?`, `onLocate`, `onClear` |
| `PhotoPicker` | Up to `max` photos/videos as a thumbnail grid with add tile, upload spinner, error and remove | `items: PhotoItem[]`, `max`, `onAdd(files)`, `onRemove(id)`, `disabled?` |
| `QuoteCard` | A provider's quote for the customer: "Ravi S.", proficiency, ~distance, price, note, Decline/Accept (optionally locked with a reason) | `quote: CustomerQuote`, `cheapest?`, `lockedNote?`, `onAccept?`, `onReject?` |
| `JobMap` | OpenStreetMap (react-leaflet) with the provider's radius and approximate job circles only, never exact pins; popups open the job | `area`, `jobs: JobMapItem[]`, `center?`, `height?` |
| `ProviderCard` | A pro in search results: photo, name, level, area · ~distance, matched skills, working days; `compact` for carousels | `provider: ProviderCard`, `onOpen`, `compact?` |
| `PROFICIENCY_LABEL` | Customer-facing level names (Beginner / Skilled / Expert) | constant |

## `src/components/wrapper` (may use the router and redux)
| Component | Purpose |
|---|---|
| `SuspenseWrapper` | Shows `PageSkeleton` (or `fallback`) while a lazily loaded page or layout downloads |
| `AuthWrapper` | Route guard: asks for log-in (customer or provider page by `roles`), finishes pending sign-up steps, then checks the role |

The app shells are pages, not components: `pages/main/MainPage.tsx` (430px mobile shell with role-based bottom tabs; UI in `clients/default/main/mainLayout.tsx`) and `pages/admin/AdminPage.tsx` (desktop console sidebar; UI in `clients/default/admin/adminShellLayout.tsx`). `ComingSoon` (in `components/common`) shows planned and missing pages.

## `src/components/admin` (admin console, desktop)
| Component | Purpose | Key props |
|---|---|---|
| `PageHeader` | Console page title, one-line description and right-aligned actions or filters | `title`, `description?`, `actions?` |
| `KpiCard` | A labelled number (dashboard, status), amber when something waits for an admin; a button when `onClick` opens the page behind it | `label`, `value`, `hint?`, `attention?`, `onClick?` |

## Before creating a new component
1. Search this catalogue and `src/components/**`. Extend an existing component with an optional prop rather than forking it.
2. If it has no Helpio concepts, it goes in `ui/`. If it does but works on any screen, it goes in `common/`. If it's used by one screen only, keep it as markup in that screen's layout.
3. Keep it pure (see architecture.md), type props with `common/CommonDto`, export it from the folder's `index.ts`, and add a row here.

## Notes
- `JobMap` is exported lazily from the `common` barrel (the map library is large); render it inside a `Suspense` boundary (every page's `SuspenseWrapper` covers it).
- Emailed codes use `OtpField` (in `clients/default/auth/shared/authFields.tsx`, inside an antd `Form`), shared by the password-reset layout and `EmailCodeStep` (`clients/default/auth/shared/emailCodeStep.tsx`).
