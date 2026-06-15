# Trade Break Resolution Console

*A permission-aware Ops console for triaging failed trade settlements*

---

## 1. Overview

Every day, a percentage of trades a bank executes fail to settle cleanly —
the quantity booked doesn't match what the counterparty confirms, a price is
off by a rounding convention, a settlement date lands on the wrong side of a
holiday calendar. Operations analysts call these "breaks," and today most
banks still triage them across a patchwork of spreadsheets, shared inboxes,
and email chains. I designed and built the Trade Break Resolution Console to
replace that patchwork with a single, permission-aware queue where an
analyst can see every open break, understand its risk, and resolve it
without leaving the tool — while breaks that carry compliance risk are
automatically routed to someone senior enough to own that decision. The
result is a working prototype: a real, interactive React application with
30 simulated trade breaks, not a static mockup.

## 2. The Problem

At most mid-size and large trading desks, break management still runs on
three uncoordinated channels:

- **A shared spreadsheet** that acts as the "source of truth" for open
  breaks, manually updated by whoever last touched a row. It has no audit
  trail, no validation, and no way to tell if someone else is already
  working the same break.
- **Email threads with counterparties and internal desks**, where the
  reasoning behind a resolution — *why* a break was closed, not just that it
  was — lives in someone's inbox and disappears when they're out sick or
  leave the team.
- **Ad hoc escalation**, usually a Slack message or a walk to someone's
  desk, with no consistent rule for which breaks actually need a senior
  sign-off versus which an analyst can close on their own judgment.

Three pain points fall directly out of this:

1. **No reliable audit trail.** When Compliance asks "why was this break
   closed as resolved," the answer often lives in someone's memory or a
   buried email, not in a system of record.
2. **Inconsistent escalation.** Two analysts facing the same type of
   high-value break might handle it differently — one escalates, one
   doesn't — because there's no enforced rule tied to the data itself.
3. **Duplicated or dropped work.** Without row-level locking or clear
   ownership, two analysts can end up working the same break, or a break
   can sit untouched because everyone assumes someone else has it.

## 3. Discovery & Assumptions

I want to be upfront: this is a self-directed portfolio project, not the
output of real interviews with a bank's Ops desk. I don't have access to an
actual trading Ops team, so I built this from public domain knowledge of how
post-trade settlement and break management generally work (T+1/T+2
settlement cycles, standard break taxonomies like quantity/price/date
mismatches, and the fact that reason codes and audit trails are a
regulatory expectation, not a nice-to-have, in most post-trade workflows).

Where I couldn't validate an assumption with a real user, I picked the most
defensible, realistic option and documented it here rather than guessing
silently:

- **Analysts triage by severity and age first, counterparty second.** A
  break that's been open 48 hours matters more than one opened 20 minutes
  ago, regardless of which counterparty it's with — so the queue defaults
  to sorting by age descending, with severity as an equally prominent
  column.
- **Reason codes are a closed list, not free text.** Real reg-driven
  workflows almost always constrain the "why" to a controlled vocabulary so
  the data stays reportable. I modeled this as a fixed list per action type
  rather than a free-text field.
- **Not every break carries the same risk.** I assumed some threshold —
  here, simulated as `requiresSeniorApproval` on critical/high-value breaks
  — exists that pushes a break out of an individual analyst's authority and
  into Senior Ops / Compliance territory.
- **This is a desktop tool.** Ops analysts triage breaks at a multi-monitor
  desk during market hours, not from a phone. I optimized for information
  density on a laptop-or-larger screen rather than for mobile responsiveness
  (see Design Decisions).

## 4. Workflow Mapping

**As-is (spreadsheet + email):**

```
Overnight recon run
        │
        ▼
Break lands in shared spreadsheet ──► Analyst notices it (maybe)
        │                                     │
        ▼                                     ▼
Email counterparty / desk           Row edited directly, no history
        │                                     │
        ▼                                     ▼
Reply arrives in inbox              Status changed by typing over old value
        │                                     │
        └───────────────┬─────────────────────┘
                         ▼
        Break marked "done" — reasoning lives in email, not the sheet
```

**To-be (this console):**

```
Overnight recon run
        │
        ▼
Break created in queue, status = New
        │
        ▼
Analyst opens Break Detail ──► sees full trade data + counterparty history
        │
        ▼
Analyst selects an action (Resolve / Escalate / Reassign)
        │
        ▼
Reason code required + optional notes ──► validated before submit
        │
        ▼
Status updates, audit trail entry appended automatically
        │
        ├── requiresSeniorApproval? ──► action disabled for Ops Analyst role
        │                               until a Senior Ops/Compliance user acts
        ▼
Resolved ──► can be Reopened (with its own reason code) if it fails again
```

The core shift is that **status changes and their justification happen in
the same step**, in the same system, instead of being reconstructed
afterward from a separate conversation.

## 5. Design Decisions

**Severity color coding (red/orange/yellow/green).** I used a semantic,
high-contrast palette scoped only to severity — Critical, High, Medium,
Low — and kept it out of every other UI element so it can't be confused
with workflow status. A left-edge "rail" of severity color runs down each
table row, echoing how paper exception reports use a colored tab in the
margin; it lets an analyst scan for red without reading every cell.

**Why reason codes are required, not optional.** Making the reason code a
hard requirement before submitting Resolve, Escalate, Reassign, or Reopen
is the single decision that fixes pain point #1 (no audit trail). It costs
the analyst one extra click, but it means the audit trail is populated as a
side effect of doing the job, not as separate paperwork someone has to
remember to do later.

**Why the role switcher exists.** I don't have a real auth system in this
prototype, so the role switcher is a stand-in for "log in as a different
person" — it lets anyone reviewing this project see both sides of the
permission logic (analyst vs. senior/compliance) without needing two
separate accounts. In a shipped product this would be replaced by actual
SSO-based role resolution; the switcher is a prototyping device, not a
proposed production feature.

**Disabled vs. hidden for permission-gated actions — I chose disabled.**
When a break requires senior approval and the current role is Ops Analyst,
the resolution actions are visibly present but disabled, with a banner
explaining why. I considered hiding them entirely, but disabled-with-reason
is more honest: it tells the analyst the break exists and needs attention,
just not from them, which matters for situational awareness during a busy
morning. Hiding the controls would make it look like nothing needs to
happen on that break at all.

## 6. Component / Design System Notes

A small token system underlies everything, defined in
`src/styles/tokens.css`:

- **Color** — a navy/slate neutral scale for structure and text, one signal
  blue reserved exclusively for interactive/focus states, and four
  semantic severity scales (critical/high/medium/low), each with a 600,
  500, 100, and 50 shade for text, icon, border, and background use.
- **Type** — a system font stack (per the enterprise-tool brief) with a
  7-step scale from `11px` to `24px`, tuned for a dense table-heavy UI
  rather than marketing-page hierarchy.
- **Spacing** — a strict 4px grid (`--space-1` through `--space-12`) so
  padding and gaps stay consistent across a codebase with many small
  components.

Reusable components, each in its own folder with co-located CSS Modules:

- **`Button`** — 4 variants (primary/secondary/danger/ghost), 2 sizes.
- **`SeverityTag`** — the four severity pills, each with a colored dot.
- **`StatusBadge`** — the five workflow-status pills; `Reopened` uses a
  distinct diagonal-striped fill rather than a flat color so it can never be
  mistaken for a fresh status at a glance.
- **`DataTable`** — a generic, typed table component (sorting, row
  selection, keyboard-activatable rows, empty state) reused for the break
  queue and built to accept any row shape via TypeScript generics.
- **`Modal`** — a right-side drawer (used for the Break Detail panel and
  bulk-action dialogs), with focus-on-open and Escape-to-close.
- **`FormField`** — a labeled select/textarea with built-in required-field
  and validation-error states, used throughout the resolution action form.

## 7. Engineering Handoff Notes

Written as I would hand them to a developer picking this up:

- **AC:** A user cannot submit a Resolve, Escalate, Reassign, or Reopen
  action without selecting a reason code from the predefined list for that
  action type. Attempting to submit without one shows an inline error and
  blocks submission.
- **AC:** Reassign additionally requires a selected assignee before it can
  be submitted.
- **AC:** If the current role is "Ops Analyst" and the break's
  `requiresSeniorApproval` flag is true, all resolution-action controls are
  rendered disabled and a banner explains why. Switching the role to
  "Senior Ops / Compliance" re-enables them immediately without a page
  reload.
- **AC:** Every successful action appends an entry to that break's audit
  trail containing actor, timestamp, action type, reason code, optional
  note, and the from/to status — the trail is append-only within a session.
- **AC:** Bulk assign and bulk escalate apply only to selected breaks the
  current role is permitted to act on; permission-locked breaks in the
  selection are explicitly called out as skipped, not silently ignored.
- **AC:** A break with `trade.isPartial = true` renders a "data
  unavailable" banner and shows "Data unavailable" in place of any null
  field, instead of leaving the field blank or hiding it.

## 8. Edge Cases Handled

1. **Incomplete / missing trade data** (`BRK-10025`) — When upstream trade
   fields come back null, the detail view shows an explicit warning banner
   and labels each missing field "Data unavailable" in italic, rather than
   showing a blank cell that could be misread as zero or as a loading
   state.
2. **No permission to resolve** (`BRK-10026`) — Breaks flagged
   `requiresSeniorApproval` render fully (an analyst can still read every
   detail) but all four resolution actions are disabled with a banner
   naming the reason and pointing at the role switcher to see the
   authorized view.
3. **Reopened after resolution** (`BRK-10027`) — The status badge for
   Reopened uses a diagonally striped fill distinct from every other status
   color, a dedicated banner at the top of the detail panel calls out that
   this break was previously closed, and the original Resolve entry stays
   visible in the audit trail alongside the new Reopen entry so nothing is
   overwritten.

## 9. What I'd Do Next

1. **Usability testing with real Ops analysts** — even a handful of
   think-aloud sessions with people who triage breaks daily would surface
   whether age-then-severity is really the right default sort, and whether
   the reason-code lists match how their desk actually talks about breaks.
2. **Real-time updates** — right now this is single-session state; a
   production version needs breaks to update live as other analysts act on
   them, plus a lightweight "someone else has this open" indicator to solve
   the duplicated-work problem from the original spreadsheet workflow.
3. **A rules engine for bulk resolution** — for high-volume, low-severity
   break types (e.g. rounding-level price breaks under a materiality
   threshold), I'd explore auto-suggesting a resolution with one-click
   confirm, rather than requiring the full manual form for every row.
4. **Exportable audit reports** — Compliance will eventually want a
   filtered, exportable view of the audit trail (by date range, break type,
   or reason code) for periodic review, which this prototype doesn't yet
   support.
