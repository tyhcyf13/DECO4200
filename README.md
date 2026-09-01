# Medication companion — prototype

A mid/high-fidelity, clickable front-end prototype for DECO4200: a physical-digital
medication management companion. It's a design concept, not a product — there is
no backend, no auth, and no persistence; everything lives in memory for the
length of a browser session.

## The concept

Someone managing several long-term medications shouldn't have to think in terms
of prescriptions, dosages, or schedules day to day. The digital system quietly
consolidates everything — pharmacy records, dose sequencing, refill tracking —
into **one simplified daily routine**, delivered through a **single quiet
device**. The person only ever answers one question: *what do I need to take
right now?*

The prototype renders a device shell (bezel, screen, three hardware keys, a
stand) and the on-screen UI is driven **only** by those three keys — DONE,
LATER, and **?**. There is no touch UI, no menu, no nav bar inside the device
screen. Deferring ("LATER") is treated as a first-class choice, not a failure
state: the interaction vocabulary deliberately has no red, no alarms, no
streaks, no scores, and no escalating language.

Beside the device sits a **background-system panel** — explanatory scaffolding
for the design concept, not part of the imagined product — showing the
scenario picker, a five-stage progress track, and a timestamped log of what
the background system is doing on the person's behalf.

## The state machine

The entire interaction model lives in `src/stateMachine.js`, a single,
dependency-free, pure module (no React, no timers, no DOM). It is deliberately
the most important file in the prototype — the state machine *is* the
deliverable, not scaffolding around it. It's covered by
`src/test/stateMachine.test.js` (`npm test`).

States: `quiet → due → dose → confirmed → next`, with `change` and `info` /
`deferred` as side states reached only from specific places:

| State       | What's shown                                              | Reached from |
|-------------|-------------------------------------------------------------|--------------|
| `quiet`     | Large clock, "Nothing to take until…". Keys dimmed.         | start / `next` |
| `change`    | "Something changed" interruption for a prescription update. | `quiet` (medication-change scenario only) |
| `due`       | Greeting, "N medications to take now", names + dosages.     | `quiet`, `change`, `deferred` |
| `dose`      | One medication at a time, with progress pips.                | `due`, `info` |
| `info`      | Plain-language purpose, when, how much.                      | `dose` only |
| `deferred`  | "I will ask again at 8:30." Screen dims, no countdown.        | `due`, `dose` |
| `confirmed` | Ring + tick, "All N taken · time", next block time.           | `dose` |
| `next`      | The day as three columns (morning/afternoon/evening).         | `confirmed` |
| `dayDone`   | "All done for today." Nothing more scheduled.                 | `next`, once no later block has anything scheduled |

Two event types drive it: the three hardware keys (`DONE` / `LATER` / `HELP`),
and `SYSTEM_TICK` — the passage of time (a block becoming due, or a deferred
reminder firing). `SYSTEM_TICK` is never triggered by a key press, only by a
timer (or the "Skip wait" control in the background panel, for demo purposes).

Deferring is non-destructive: a block held open by `LATER` keeps whatever was
already completed and simply re-shows the same `due` prompt at the reminder
time, with identical wording — never "missed," never escalating.

`src/background.js` is a separate, equally pure module that narrates
transitions into the background-log sentences. It has no knowledge of UI and
the state machine has no knowledge of copy or med data — each module has one
job.

## Design system

The brief specifies a **Nocturne** design system bound at
`_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/`. That bundle lives in a
claude.ai design-system project and pulling it requires authorizing this
environment against that account (`/design-login` + the DesignSync tool) —
not available in the environment this prototype was built in. In its place,
`_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/styles.css` is a
hand-authored **stand-in token set** that matches every constraint the brief
gives for Nocturne: dark ground, Inter at weight 500 for headings, a single
blurple accent used only as a line/glow (never a flood), 8px component radii,
a dense 0.7× spacing scale, `:focus-visible` rings, and themed hover/pressed
states from the accent ramp. `src/app.css` (the product's own styling) draws
every color, font, space, radius, and shadow from that file's custom
properties — nothing is hard-coded. Swapping in the real synced bundle should
only mean replacing token values, not touching component code.

## Running it

```
npm install
npm run dev       # starts the Vite dev server
npm test          # runs the state-machine test suite
npm run build     # production build
```

## Keyboard

The on-screen keys mirror physical hardware keys; the keyboard mirrors them
too, for testing without a mouse:

- `Enter` or `D` — DONE
- `L` — LATER
- `?` — help (read aloud / medication information)

## Scenarios

The background panel's scenario picker resets the whole prototype into one of
three demo paths:

- **Normal morning** — press DONE through the whole routine.
- **Deferred morning** — press LATER on the routine or on a dose, then either
  wait for the simulated reminder or use "Skip wait."
- **Morning with a medication change** — a change interruption appears before
  the routine; press DONE ("I understand") to acknowledge it.

"Restart scenario" replays the current scenario from `quiet`.
