# UI review checklist

Go through every item before calling UI work done. Fix it or explicitly call it out.

## Architecture
- [ ] Behaviour (queries, state, navigation, handlers) lives in `pages/<feature>/*.page.tsx` or a hook in `src/hooks/`.
- [ ] All markup lives in `client/default/<feature>/*.layout.tsx`, typed by `<feature>.layout.types.ts`.
- [ ] Components in `src/component/ui|marketplace` have no router, redux, API or `pages/` imports. Check with:
      `grep -rnE "react-router-dom|redux|\.api'|/pages/" src/component/ui src/component/marketplace` (must print nothing).
- [ ] Shared types and enums are in `src/common`. No TS `enum`.
- [ ] Navigation uses `RouterKeys` / `toPath()`.

## Reuse
- [ ] Nothing re-implements a catalogue component (chips, progress, stepper, badges, cards, carousels…).
- [ ] New reusable components are exported from the barrel and documented in `components.md`.

## Design
- [ ] Only brand and semantic Tailwind colours; no new hex values.
- [ ] Spacing follows the system (`gap-6` sections, `px-5` gutter, `rounded-2xl` cards).
- [ ] At most one or two gradient surfaces on the screen. One primary action per card.
- [ ] Styled text uses `div`/`span`, not `p`/`h*` (global SCSS overrides those).
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
