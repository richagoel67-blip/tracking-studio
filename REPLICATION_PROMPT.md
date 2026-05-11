# Master prompt — replicate Tracking Studio (UI/UX parity)

Copy the block below into another Cursor chat, issue, or brief. Replace the placeholder at the end with your **published repository URL** or attach screenshots/exports for pixel-perfect fidelity.

---

You are building a web app that must match an existing product: **Tracking Studio** — a TAO-branded tracking configuration wizard with the same layout, flows, and visual language.

## Tech stack (must match)

- React + TypeScript
- TanStack Router + TanStack Start (file-based routes under `src/routes/`)
- Vite; config may use `@lovable.dev/vite-tanstack-config` pattern (see `vite.config.ts`)
- Tailwind CSS v4 with `@tailwindcss/vite`
- shadcn-style UI: Radix primitives under `src/components/ui/*` (Button, Input, Select, Dialog, Tooltip, etc.)
- Icons: lucide-react
- Toasts: sonner
- Client-only persistence for the configure wizard: `localStorage` (draft + live setup keys)

## Branding and shell (TAO)

- App shell: fixed top header (h-16), white background, border, search bar, client selector, avatar initials "AK", product name "TAO".
- Optional left sidebar for non-configure routes; configure flow can hide sidebar (`hideSidebar`) per route wrapper.
- Main content area uses neutral "canvas" background; cards are white with subtle borders/shadows.
- Typography: `text-sm`, system sans, antialiased.

## Design tokens (Figma-aligned)

- Heavy use of CSS variables for grays, borders, primary/secondary/success/warning/error: e.g. `var(--figma-gray-text-05)`, `var(--figma-gray-border-02)`, `var(--figma-secondary-main)`, `var(--figma-primary-main)`, `var(--figma-success-main)`, etc. in classNames.
- Chips/pills for events: VIEW (secondary), LEAD (primary), APPLY_START (warning), APPLY_FINISH (success), custom (neutral gray).
- Dashed "add" CTAs on flow canvas: grey default, secondary blue on hover, consistent with "Add flow".

## Information architecture (routes)

Implement these routes with the same UX intent:

- `/` — dashboard/home placeholder
- `/configure` — main wizard (architecture → build flow → review → launch); wrapper constrains height `calc(100dvh - 4rem)` with overflow hidden; stage 2 split: ~68% flow canvas + ~32% right panel; header strip with stepper + actions; canvas scroll internal; zoom +/- pinned bottom-right of canvas column.
- `/installation-guide`, `/test-mode`, `/snippets`, `/alerts` — secondary flows as in the reference app.

## Configure wizard — functional requirements

### Stages

1. **Select architecture**: two large cards — Pixel tracking vs Server-to-server (S2S). Next creates/keeps flows.
2. **Build tracking flow**: Job Ad Click root above columns; multiple flows; each flow: rename, duplicate, delete; attach career site (max 2 unique globally) and up to 2 ATS per flow; reuse from catalog via dropdowns with info banners ("Maximum 2 career sites…", "Maximum 2 ATS…").
3. **Review**: summary cards + per-flow readiness + edit flow; blockers list when invalid.
4. **Launch success**: different copy for Pixel vs S2S; next steps list.

### Architectures

- **Pixel**: career base URL required; ATS "base URL"; per-event URL + JS/Image method for enabled defaults and customs; customs always "on" in data model; max 5 custom events globally; LEAD supported.
- **S2S**: same canvas structure; career uses **Endpoint URL** field (`s2sEndpointUrl`), not base URL in UI; ATS uses `endpointUrl` as S2S endpoint; no per-event URLs or pixel method UI; default + custom event toggles; customs can be toggled off; career panel: no event source, no test button (match reference); ATS: event source + endpoint + events + test as in reference; validation requires endpoint + at least one selected event + custom name when custom enabled; duplicate custom keys blocked.

### Lifecycle / modes

- Save draft (wizard), restore draft banner, discard draft.
- After launch: persist **live** snapshot; reopen configure → **read-only** flow chart (stage 2), header: Edit setup, Run tests, View guide, Exit.
- Edit setup → banner "Editing live setup" / publish warning; Review changes; publish returns to read-only; toast on publish.
- Change summary for live edits: architecture-specific diff lines (`tracking-setup-diff.ts` pattern).

### Key files to mirror (names and responsibilities)

- `src/components/tracking-studio/AppShell.tsx` — layout chrome.
- `src/routes/configure.tsx` — height wrapper + `ConfigureTrackingSetup`.
- `src/components/tracking-studio/configure/ConfigureTrackingSetup.tsx` — wizard state machine, canvas, panels, review, launch, lifecycle.
- `src/components/tracking-studio/configure/tracking-events.ts` — `CareerSiteState`, `AtsState`, `TrackingEvent`, normalization, validation, chips, `SETUP_DATA_VERSION` migrations.
- `src/components/tracking-studio/configure/tracking-setup-storage.ts` — snapshot type, load/save draft/live, migrate.
- `src/components/tracking-studio/configure/configure-event-forms.tsx` — event rows (Pixel vs S2S branches).
- `src/components/tracking-studio/configure/tracking-setup-diff.ts` — live edit diff lines.

## UX polish (non-negotiable)

- Stepper shows 4 steps with icons and subtitles; completed steps navigable where allowed; disabled in read-only.
- Tooltips on icon buttons (duplicate/delete flow).
- Right panel scrolls independently; canvas pans/zooms without losing zoom controls.
- Empty states: "Select a node on the canvas" when nothing selected.
- Use same spacing scale (`space-y-5`, `p-5`, `px-6 py-4` in headers) and border/shadow tokens as reference.

## Deliverable

Implement feature parity and visual parity with the reference implementation. Prefer copying structure and token usage over inventing a new design system. Add a short README with `npm install`, `npm run dev`, and note on `localStorage` keys for draft/live.

**Reference repository URL or zip:** [PASTE YOUR PUBLISHED REPO URL OR ATTACH EXPORT]

---

## More fidelity

- Link the **actual** pushed Git repository in the placeholder above, or attach screenshots of each wizard stage for the implementing agent.
