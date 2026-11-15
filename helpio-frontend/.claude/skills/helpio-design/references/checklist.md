# UI review checklist

Go through every item before calling UI work done. Fix it or explicitly call it out.

## Architecture
- [ ] Logic (queries, state, navigation, handlers) lives in `pages/<module>/screens/<feature>/<feature>.page.tsx` (or files beside it). Only hooks shared by 2+ screens are in `src/hooks/`.
- [ ] All markup lives in `clients/default/<module>/screens/<feature>/<feature>Layout.tsx` / `<feature>Form.tsx`, typed by the screen's `types/<feature>.dto.ts`, registered in `clients/index.ts`, and rendered by the page inside `SuspenseWrapper`.
- [ ] Layouts use no hooks, state or router: `grep -rnE "\buse[A-Z]\w*\(|useState|useEffect" src/clients` prints nothing.
- [ ] Components have no router, redux, API or `pages/` imports. Check with:
      `grep -rnE "react-router-dom|redux|\.api'|/pages/" src/components/ui src/components/common src/components/admin` (must print nothing).
- [ ] URLs come from `APIS`; endpoints sit in the screen's, module's or common api file by who uses them; cache tags use `one()` / `list()`.
- [ ] Imports use `@/…`; only the file's own folder uses `./…` (no `../`).
- [ ] Shared types and enums are in `src/common`. No TS `enum`.
- [ ] Navigation uses `RouterKeys` / `toPath()`.

## Reuse
- [ ] Nothing re-implements a catalogue component (chips, progress, stepper, badges, cards, carousels…).
- [ ] New reusable components are exported from the barrel and documented in `components.md`.

## Design
- [ ] Only brand and semantic Tailwind colours; no new hex values.
- [ ] Spacing follows the system (`gap-6` sections, `px-5` gutter, `rounded-2xl` cards).
- [ ] At most one or two gradient surfaces on the screen. One primary action per card.
- [ ] Page and section titles are real headings (`h1`–`h3`) styled with utilities.
- [ ] Press feedback on tappable surfaces. Disabled actions explain why.

## States and content
- [ ] Every data section has loading, empty, error and data states.
- [ ] Copy is plain, short and action-oriented. Money is formatted with `formatINR`.
- [ ] Privacy: approximate location and masked identity before hire.

## Responsive and accessibility
- [ ] Works at 360px and 430px; only carousels scroll horizontally.
- [ ] Icon-only buttons have `aria-label`. Toggles, expanders and progress have the right ARIA.
- [ ] Primary tap targets are at least 40px. Status is never shown by colour alone.

## Verify
- [ ] `npm run lint` passes, or only pre-existing unrelated issues remain and are reported.
- [ ] `npm run build` passes (`tsc -b` + vite).
- [ ] Manually exercised in `npm run dev`: each interactive control does something visible.
