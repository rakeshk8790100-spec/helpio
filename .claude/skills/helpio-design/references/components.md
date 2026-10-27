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
| `Avatar` | Profile photo, or initials on the brand gradient | `name`, `src?`, `size: sm \| md \| lg \| xl` | coloured initial circles, raw `<img>` avatars |
| `AvatarUpload` | Large avatar with camera badge; tap to pick a new photo | `name`, `src`, `uploading`, `onPick(file)` | custom photo pickers |
| `MenuRow` | Settings row: icon tile, label, hint, chevron or trailing badge (stack in a rounded card) | `Icon`, `label`, `hint?`, `onClick?`, `trailing?`, `tone?: 'default' \| 'danger'`, `disabled?` | hand-made list rows |
| `IconTile` | Icon square + caption for grids | `Icon`, `label`, `onClick?` | category/shortcut tiles |
| `PageSkeleton` | Page-level loading skeleton | none | spinners |
| `ChipMultiSelect` | Multi-select chip group; works inside antd `Form.Item` | `options: { value, label }[]`, `value?`, `onChange?`, `ariaLabel` | checkbox groups for days/tags |
| `ChipSelect` | Single-choice chip group that wraps (e.g. service radius); works inside `Form.Item` | `options`, `value?`, `onChange?`, `ariaLabel` | `Segmented` with too many options for 360px |
| `StepProgress` | Segmented "Step N of M" bar for multi-screen flows | `steps: string[]`, `current` (1-based) | ad-hoc progress bars |
| `GoogleButton` | Official Google Identity Services button | `clientId`, `onCredential(idToken)` | custom Google buttons |
| `ProgressBar` | Thin progress bar with `role="progressbar"` (milestones 0/25/50/75/100) | `value`, `label`, `variant?: 'plain' \| 'glass'` | ad-hoc width bars |
| `EmptyState` | Empty section: icon, one line, optional action | `Icon`, `text`, `actionLabel?`, `onAction?` | blank sections |
| `AlertBanner` | Inline error notice with Retry (`role="alert"`) | `message`, `onRetry?` | antd `Alert` for failed requests |

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
| `HelpioLogo` | Brand mark + "helpio" wordmark (header) | `size?: 'sm' \| 'md'` |
| `SkillPicker` | Provider skills: category tabs, skill chips, proficiency per selected skill | see the component's props |
| `UserMenu` | Signed-in header avatar with account details and Log out | `user`, `onLogout` |
| `ActiveJobCard` | Gradient card for the hired job in progress: status, progress, next step, action, red Safety | `eyebrow`, `title`, `statusLabel`, `progressPct`, `nextStep`, `actionLabel`, `onAction`, `onSafety` |
| `JobCard` | A customer's job in a list: status badge, meta line, amount on the right | `title`, `meta`, `badge`, `amount?`, `amountLabel?`, `urgent?`, `onClick` |
| `NearbyJobCard` | Provider view of a job before hire: ~distance, area, "Asha K.", budget, my quote status | `job: NearbyJob`, `onOpen` |
| `ChecklistCard` | Dark provider checklist (done/pending/coming soon) with a locked-action note and one CTA | `title`, `items`, `lockedNote?`, `actionLabel?`, `onAction?` |
| `CurrentLocationButton` | "Use my current location", or "added" with Remove; geolocation errors suggest the pincode (pair with `useCurrentLocation`) | `coordinates`, `locating`, `error?`, `onLocate`, `onClear` |
| `PhotoPicker` | Up to `max` photos/videos as a thumbnail grid with add tile, upload spinner, error and remove | `items: PhotoItem[]`, `max`, `onAdd(files)`, `onRemove(id)`, `disabled?` |
| `QuoteCard` | A provider's quote for the customer: "Ravi S.", proficiency, ~distance, price, note, Decline/Accept (locked with a reason until escrow exists) | `quote: CustomerQuote`, `cheapest?`, `lockedNote?`, `onAccept?`, `onReject?` |
| `JobMap` | OpenStreetMap (react-leaflet) with the provider's radius and approximate job circles only, never exact pins; popups open the job | `area`, `jobs: JobMapItem[]`, `center?`, `height?` |
| `ProviderCard` | A pro in search results: photo, name, level, area · ~distance, matched skills, working days; `compact` for carousels | `provider: ProviderCard`, `onOpen`, `compact?` |
| `PROFICIENCY_LABEL` | Customer-facing level names (Beginner / Skilled / Expert) | constant |

## `src/component/layout` (app shell)
| Component | Purpose |
|---|---|
| `AppLayout` | 430px mobile shell: header with `HelpioLogo`, scrolling content (`<Outlet/>`), role-based bottom tabs (customer: Home/Search/My jobs/Profile; provider: Home/Jobs/Earnings/Profile) and Log in button (both hidden on log-in, sign-up and password pages) |
| `ComingSoon` | Placeholder for routes not built yet (catch-all child route) |

## Before creating a new component
1. Search this catalogue and `src/component/**`. Extend an existing component with an optional prop rather than forking it.
2. If it has no Helpio concepts, it goes in `ui/`. If it does but works on any screen, it goes in `marketplace/`. If it's used by one screen only, keep it as markup in that screen's layout.
3. Keep it pure (see architecture.md), type props with `common/CommonDto`, export it from the folder's `index.ts`, and add a row here.

## Removed (restore from git history if a future screen needs them)
The earlier customer/provider dashboard used `ProgressBar`, `Stepper`, `AlertBanner`, `EmptyState`, and job/quote/provider cards (active-job cards, milestone progress, approx map, earnings, onboarding). They were deleted with the dashboard. Rebuild them pure, following these rules, when a screen needs them.

`OtpVerify` was removed when log-in moved to email + password. Emailed codes now use `OtpField` (in `client/default/auth/authFields.tsx`, inside an antd `Form`), shared by the password-reset layout and `EmailCodeStep` (`client/default/auth/emailCodeStep.tsx`, sign-up's "Verify your email" step for both audiences).
