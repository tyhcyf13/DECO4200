# Medication companion — prototype

A mid/high-fidelity, clickable front-end prototype for DECO4200: a physical-digital
medication management companion. It's a design concept, not a product — there is
no backend, no auth, and no persistence; everything lives in memory for the
length of a browser session.

**Live demo:** https://tyhcyf13.github.io/DECO4200/ (add to your phone's home
screen for a full-screen, app-like launch — see [Deployment](#deployment)).

## The concept

Someone managing several long-term medications shouldn't have to think in terms
of prescriptions, dosages, or schedules day to day. The digital system quietly
consolidates everything — pharmacy records, dose sequencing, refill tracking —
into **one simplified daily routine**, delivered through a **single quiet
device**. The person only ever answers one question: *what do I need to take
right now?*

The core proposition: **digital for complexity, physical for interaction.**
Everything that's hard — reconciling prescriptions, sequencing doses, tracking
changes, forecasting refills — happens in the digital layer, invisibly. The
physical device is where the person actually acts: medication is loaded into
it, a dose becomes due on it, they confirm on it. The device is never an
accessory to a phone app; it's the primary everyday interaction.

The prototype renders a device shell (bezel, screen, three hardware keys, a
stand) and the on-screen UI is driven **only** by those three keys — DONE,
LATER, and **?**. There is no touch UI, no menu, no nav bar inside the device
screen. Deferring ("LATER") is treated as a first-class choice, not a failure
state: the interaction vocabulary deliberately has no red, no alarms, no
streaks, no scores, and no escalating language. Even so, a dose deferred
several times in a row softens into a calmer "still waiting" prompt rather
than repeating the same message indefinitely — the user is always offered the
choice, never pressured.

Beside the device sits a **background-system panel** — explanatory scaffolding
for the design concept, not part of the imagined product — showing the
scenario picker, a six-stage progress track, a timestamped log tagged
digital/physical, an optional (off by default) support-person toggle, and a
short list of the design's safety/ethics principles.

## The state machine

The entire interaction model lives in `src/stateMachine.js`, a single,
dependency-free, pure module (no React, no timers, no DOM). It is deliberately
the most important file in the prototype — the state machine *is* the
deliverable, not scaffolding around it. It's covered by
`src/test/stateMachine.test.js` (`npm test`, 34 tests).

| State            | What's shown                                                     | Reached from |
|------------------|-------------------------------------------------------------------|--------------|
| `quiet`          | Large clock, "Nothing to take until…". Only `?` is enabled.       | start / `next` |
| `setupScan`      | "Scan your prescription" (physical pathway only).                 | start (physical setup scenario) |
| `setupReview`    | "Prescription received" (digital) / "Prescription read" (physical).| start (digital pathway), or `setupScan` |
| `setupLoad`      | "Load your medications — N medications · Morning/Afternoon/Evening".| `setupReview` |
| `setupLoaded`    | Ring + tick, "Routine ready — first dose due at [time]".            | `setupLoad` |
| `change`         | "Something changed" — every change at once, old (struck through) / new (highlighted).| `quiet` (medication-change scenario, morning block only) |
| `routineUpdated` | Brief confirmation of the routine's new shape.                     | `change` |
| `due`            | Greeting, "N medications to take now", names + dosages.            | `quiet`, `routineUpdated`, `deferred` |
| `dose`           | One medication at a time, with progress pips.                       | `due`, `info` |
| `info`           | Plain-language purpose, when, how much.                             | `dose` only |
| `didITakeIt`     | "[Block] dose — Recorded as taken — [time]", or "nothing yet."      | `quiet` only, via `?` |
| `deferred`       | "I will ask again at 8:30." Screen dims, no countdown.               | `due`, `dose` |
| `confirmed`      | Ring + tick, "All N taken · time", next block time.                  | `dose` |
| `next`           | The day as three columns (morning/afternoon/evening).                | `confirmed` |
| `dayDone`        | "All done for today." Nothing more scheduled.                        | `next`, once no later block has anything scheduled |

Two event types drive it: the three hardware keys (`DONE` / `LATER` / `HELP`),
and `SYSTEM_TICK` — the passage of time (a block becoming due, or a deferred
reminder firing). `SYSTEM_TICK` is never triggered by a key press, only by a
timer (or the "Skip wait" control in the background panel, for demo purposes).
Deferring and "did I take it?" aren't scenarios of their own — they're core
interactions of the `LATER` and `?` keys, available in any scenario, most
naturally explored during the Normal morning day.

Deferring is non-destructive: a block held open by `LATER` keeps whatever was
already completed and re-shows the same `due` prompt at the reminder time —
identical wording the first time, softening into "still waiting" phrasing
(`isStillWaiting`) only after repeated defers, and never described as
"missed."

A prescription change (a dosage change, a discontinued medication) is
scenario data, not a special case in the machine's logic: the medication-change
scenario's medication list is computed by `itemsForBlock(block, scenario)`
(in `src/meds.js`), so its `due` screen genuinely lists Ramipril at the new
5 mg and no longer lists Melatonin at all — the interruption isn't just
cosmetic. Both changes are shown together on one `change` screen and
acknowledged with a single DONE, since the user should never have to work
through a change type at a time.

`src/background.js` is a separate, equally pure module that narrates
transitions into the background-log sentences (each tagged `digital` or
`physical`). It has no knowledge of UI, and the state machine has no
knowledge of copy or med data — each module has one job.

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

The digital/physical distinction in the background log reuses this same
one-accent rule: physical entries get a filled accent dot and an accent-tinted
left border; digital entries get an outlined dot and stay in the quieter muted
tone. No second color is introduced.

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
- `?` — help (read aloud / medication information / "did I take it?" from the
  resting screen)

## Scenarios

The background panel's scenario picker resets the whole prototype into one of
four demo paths — deliberately few, so each one earns its place:

- **Normal morning** — the whole day. Press DONE through morning (Metformin,
  Ramipril), afternoon (Atorvastatin), and evening (Melatonin, a clearly
  labelled sample medication demonstrating the routine spans a full day, not
  just a morning block). Also the best scenario to explore `LATER` (defer a
  dose, then either wait or use "Skip wait" — defer twice to see the
  softened "still waiting" prompt) and `?` (check "did I take it?" from any
  resting screen).
- **Digital prescription setup** — press DONE to receive an already-verified
  prescription, load the medications, and ready the routine. Demonstrates
  the pharmacist → digital transmission → device pathway.
- **Physical prescription setup** — the parallel pathway: press DONE to scan
  a prescription, load the medications, and ready the routine. The
  background log explicitly notes the scanned prescription is verified
  against the pharmacy record — the device reads it, but doesn't decide
  anything on its own.
- **Medication change** — a change interruption appears before the routine,
  showing a dosage change (Ramipril 10 mg → 5 mg) and a discontinued
  medication (Melatonin) together on one screen, acknowledged with a single
  DONE ("I understand"). The routine that follows genuinely reflects both
  changes — the user never calculates or reorganises anything themselves.

"Restart scenario" replays the current scenario from the start.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds,
and publishes to GitHub Pages automatically — no manual deploy step. The site
also declares a web app manifest and iOS meta tags (see `index.html`,
`public/manifest.webmanifest`) so it can be added to a phone's home screen and
launches full-screen, without browser chrome, like a native app.
