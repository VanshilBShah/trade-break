# Trade Break Resolution Console

A working prototype of an internal Operations tool for triaging and resolving
failed/mismatched trade settlements ("breaks") at a capital markets desk.
Built as a portfolio case study for Technical Product Designer roles in
trading technology.

**→ Read the full case study: [CASE_STUDY.md](./CASE_STUDY.md)**

## What's here

- A functioning **Break Queue**: sortable/filterable table of 30 mock trade
  breaks, search, and bulk assign/escalate actions.
- A **Break Detail** panel: full trade data, counterparty history, an audit
  trail timeline, and a resolution action form with required reason codes
  and real validation.
- A **role switcher** (Ops Analyst vs. Senior Ops / Compliance) that
  demonstrates permission-aware UI — some breaks require senior sign-off and
  are read-only for analysts.
- Three explicitly designed edge cases: incomplete trade data, a
  permission-locked break, and a break reopened after resolution.

## Tech stack

- React 18 + TypeScript
- Vite
- Plain CSS Modules (no UI framework — hand-authored design tokens in
  `src/styles/tokens.css`)
- No backend — all data is local/mock, held in React state

## Setup

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (typically `http://localhost:5173`).

To verify a production build:

```bash
npm run build
npm run preview
```

## Screenshots

_Add screenshots of the Break Queue and Break Detail views here before
publishing this repo — e.g. `docs/screenshot-queue.png`,
`docs/screenshot-detail.png`._

## Project structure

```
src/
├── components/     Reusable UI: StatusBadge, SeverityTag, DataTable, Modal, Button, FormField
├── context/        RoleContext — simulates role-based permissions
├── data/           Mock trade break dataset (30 records)
├── pages/          BreakQueue and BreakDetail views
├── styles/         Design tokens (colors, type scale, spacing)
└── types.ts        Shared TypeScript data models
```

## Notes on scope

This is a self-directed simulation, not a client project — see
"Discovery & Assumptions" in the case study for how domain assumptions were
made without real user research. The app is desktop-first by design; see
"Design Decisions" for why.
