// The interaction model for the medication companion device, expressed as a
// pure, dependency-free state machine. No React, no timers, no DOM — this
// module is deliberately the most important file in the prototype: it is
// the thing being designed, not scaffolding around it.
//
// States
// ------
//   quiet          resting; nothing due; keys dimmed
//   setupScan       "scan this prescription" — physical-pathway setup only
//   setupReview     prescription details to review, before adding to the
//                   routine — reached directly (digital pathway) or after
//                   `setupScan` (physical pathway)
//   setupLoad       "place this medication in its compartment"
//   setupLoaded     medication loaded; routine now active
//   change          "something changed" interruption, shown before a block
//                   that has a pending prescription/dose/schedule change
//   routineUpdated  brief confirmation of the routine's new shape, shown
//                   after `change` is acknowledged, before the block's due
//                   prompt
//   due             a block has become due; names + dosages listed; DONE
//                   starts, LATER defers the whole block
//   dose            one medication at a time within the active block
//   info            medication information for the current dose (reached
//                   only from `dose`)
//   deferred        the block was deferred; screen dims; no countdown shown
//   confirmed       all items in the block are taken
//   next            the "what's next" day overview
//   dayDone         every block with medications in it is complete; nothing
//                   more today
//   didITakeIt      "was this already taken?" — reached from `quiet` only,
//                   answers without requiring the user to act on anything
//
// Events
// ------
//   DONE, LATER, HELP   mirror the three hardware keys
//   SYSTEM_TICK         the passage of time (a block becoming due, or a
//                       deferred reminder firing) — never a user action
//
// Deferring is never punished: a block held open by LATER keeps whatever
// was already completed and re-shows the same `due` prompt at the reminder
// time. If the person keeps deferring, the prompt softens into a "still
// waiting" phrasing (see `deferCount` below) rather than repeating the full
// greeting or escalating in tone.

export const STATES = Object.freeze({
  QUIET: 'quiet',
  SETUP_SCAN: 'setupScan',
  SETUP_REVIEW: 'setupReview',
  SETUP_LOAD: 'setupLoad',
  SETUP_LOADED: 'setupLoaded',
  CHANGE: 'change',
  ROUTINE_UPDATED: 'routineUpdated',
  DUE: 'due',
  DOSE: 'dose',
  INFO: 'info',
  DEFERRED: 'deferred',
  CONFIRMED: 'confirmed',
  NEXT: 'next',
  DAY_DONE: 'dayDone',
  DID_I_TAKE_IT: 'didITakeIt',
})

export const SCENARIOS = Object.freeze({
  NORMAL: 'normal',
  CHANGE: 'change',
  SETUP_PHYSICAL: 'setupPhysical',
  SETUP_DIGITAL: 'setupDigital',
})

const SETUP_SCENARIOS = [SCENARIOS.SETUP_PHYSICAL, SCENARIOS.SETUP_DIGITAL]

const BLOCK_SEQUENCE = ['morning', 'afternoon', 'evening']

// A defer prompt repeated a third time softens its wording rather than
// simply repeating — see `due`'s `stillWaiting` flag below.
const STILL_WAITING_THRESHOLD = 2

// The next block *with anything scheduled in it* — a block with nothing due
// (e.g. an evening with no medications) is skipped rather than shown as an
// empty due/dose screen.
function nextBlockWithItems(block, itemsForBlock) {
  for (let i = BLOCK_SEQUENCE.indexOf(block) + 1; i < BLOCK_SEQUENCE.length; i += 1) {
    if (itemsForBlock(BLOCK_SEQUENCE[i]).length > 0) return BLOCK_SEQUENCE[i]
  }
  return null
}

export function initialContext(scenario = SCENARIOS.NORMAL) {
  const isSetup = SETUP_SCENARIOS.includes(scenario)
  return {
    state: isSetup
      ? scenario === SCENARIOS.SETUP_PHYSICAL
        ? STATES.SETUP_SCAN
        : STATES.SETUP_REVIEW
      : STATES.QUIET,
    scenario,
    setupPathway: isSetup ? (scenario === SCENARIOS.SETUP_PHYSICAL ? 'physical' : 'digital') : null,
    block: 'morning',
    items: [], // med ids in the active block, in dose order
    doseIndex: 0,
    completed: [], // med ids already marked done in the active block
    returnState: null, // state to return to when leaving `info` / `didITakeIt`
    deferredFrom: null, // 'due' | 'dose' — which screen requested the defer
    deferCount: 0, // times this block's prompt has been deferred
    confirmedAt: null, // { h, m } wall-clock stamp for the confirmation screen
    lastConfirmed: null, // { block, at } — most recent completed block, kept
    // across block changes so `didITakeIt` (reachable any time via ? from
    // `quiet`) can answer even once `quiet` has moved on to the next block
    listening: false, // transient "reading aloud" flag on `info` / `didITakeIt`
  }
}

function firstIncompleteIndex(items, completed) {
  const idx = items.findIndex((id) => !completed.includes(id))
  return idx === -1 ? 0 : idx
}

function remainingCount(items, completed) {
  return items.filter((id) => !completed.includes(id)).length
}

/**
 * Pure reducer: (context, event, deps) -> context
 * `deps.itemsForBlock(block, scenario)` returns the ordered med-id list for
 * a block under the active scenario (a change scenario can add or remove an
 * item), and `deps.now()` returns a { h, m } wall-clock stamp — both
 * injected so the machine has zero outside knowledge of med data or real
 * time.
 */
export function transition(context, event, deps) {
  const { itemsForBlock, now } = deps
  const items = (block) => itemsForBlock(block, context.scenario)

  switch (context.state) {
    case STATES.SETUP_SCAN: {
      if (event.type === 'DONE') {
        return { ...context, state: STATES.SETUP_REVIEW }
      }
      return context
    }

    case STATES.SETUP_REVIEW: {
      if (event.type === 'DONE') {
        return { ...context, state: STATES.SETUP_LOAD }
      }
      return context
    }

    case STATES.SETUP_LOAD: {
      if (event.type === 'DONE') {
        return { ...context, state: STATES.SETUP_LOADED }
      }
      return context
    }

    case STATES.SETUP_LOADED: {
      if (event.type === 'DONE') {
        return { ...context, state: STATES.QUIET }
      }
      return context
    }

    case STATES.QUIET: {
      if (event.type === 'SYSTEM_TICK') {
        const hasChange = context.scenario === SCENARIOS.CHANGE && context.block === 'morning'
        return {
          ...context,
          items: items(context.block),
          doseIndex: 0,
          completed: [],
          state: hasChange ? STATES.CHANGE : STATES.DUE,
        }
      }
      if (event.type === 'HELP') {
        return { ...context, state: STATES.DID_I_TAKE_IT, returnState: STATES.QUIET, listening: false }
      }
      return context
    }

    case STATES.CHANGE: {
      if (event.type === 'DONE') {
        return { ...context, state: STATES.ROUTINE_UPDATED }
      }
      return context
    }

    case STATES.ROUTINE_UPDATED: {
      if (event.type === 'DONE') {
        return { ...context, state: STATES.DUE }
      }
      return context
    }

    case STATES.DUE: {
      if (event.type === 'DONE') {
        return {
          ...context,
          state: STATES.DOSE,
          doseIndex: firstIncompleteIndex(context.items, context.completed),
        }
      }
      if (event.type === 'LATER') {
        return {
          ...context,
          state: STATES.DEFERRED,
          deferredFrom: 'due',
          deferCount: context.deferCount + 1,
        }
      }
      return context
    }

    case STATES.DOSE: {
      if (event.type === 'DONE') {
        const medId = context.items[context.doseIndex]
        const completed = context.completed.includes(medId)
          ? context.completed
          : [...context.completed, medId]
        const left = remainingCount(context.items, completed)
        if (left === 0) {
          const confirmedAt = now()
          return {
            ...context,
            completed,
            state: STATES.CONFIRMED,
            confirmedAt,
            deferCount: 0,
            lastConfirmed: { block: context.block, at: confirmedAt },
          }
        }
        return {
          ...context,
          completed,
          doseIndex: firstIncompleteIndex(context.items, completed),
        }
      }
      if (event.type === 'LATER') {
        return {
          ...context,
          state: STATES.DEFERRED,
          deferredFrom: 'dose',
          deferCount: context.deferCount + 1,
        }
      }
      if (event.type === 'HELP') {
        return { ...context, state: STATES.INFO, returnState: STATES.DOSE, listening: false }
      }
      return context
    }

    case STATES.INFO: {
      if (event.type === 'DONE') {
        return { ...context, state: context.returnState ?? STATES.DOSE, listening: false }
      }
      if (event.type === 'LATER') {
        return { ...context, listening: true }
      }
      return context
    }

    case STATES.DID_I_TAKE_IT: {
      if (event.type === 'DONE') {
        return { ...context, state: context.returnState ?? STATES.QUIET, listening: false }
      }
      if (event.type === 'LATER') {
        return { ...context, listening: true }
      }
      return context
    }

    case STATES.DEFERRED: {
      if (event.type === 'SYSTEM_TICK') {
        return { ...context, state: STATES.DUE, deferredFrom: null }
      }
      return context
    }

    case STATES.CONFIRMED: {
      if (event.type === 'DONE') {
        return { ...context, state: STATES.NEXT }
      }
      return context
    }

    case STATES.NEXT: {
      if (event.type === 'DONE') {
        const block = nextBlockWithItems(context.block, items)
        if (!block) {
          return { ...context, state: STATES.DAY_DONE }
        }
        return {
          ...context,
          state: STATES.QUIET,
          block,
          items: [],
          doseIndex: 0,
          completed: [],
        }
      }
      return context
    }

    case STATES.DAY_DONE: {
      if (event.type === 'DONE') {
        // loop back to the start of the same scenario for the demo
        return { ...initialContext(context.scenario) }
      }
      return context
    }

    default:
      return context
  }
}

export function selectScenario(context, scenario) {
  return initialContext(scenario)
}

export function restart(context) {
  return initialContext(context.scenario)
}

// ---- derived view helpers (pure; used by both UI and background log) ----

export function currentMedId(context) {
  return context.items[context.doseIndex] ?? null
}

export function remainingInBlock(context) {
  return remainingCount(context.items, context.completed)
}

// A defer prompt shown for at least the third time softens into "still
// waiting" wording instead of repeating the original greeting verbatim.
export function isStillWaiting(context) {
  return context.deferCount >= STILL_WAITING_THRESHOLD
}

export function isKeyEnabled(context, key) {
  switch (context.state) {
    case STATES.QUIET:
      return key === 'help'
    case STATES.SETUP_SCAN:
    case STATES.SETUP_REVIEW:
    case STATES.SETUP_LOAD:
    case STATES.SETUP_LOADED:
      return key === 'done'
    case STATES.CHANGE:
    case STATES.ROUTINE_UPDATED:
      return key === 'done'
    case STATES.DUE:
      return key === 'done' || key === 'later'
    case STATES.DOSE:
      return true
    case STATES.INFO:
    case STATES.DID_I_TAKE_IT:
      return key === 'done' || key === 'later'
    case STATES.DEFERRED:
      return false
    case STATES.CONFIRMED:
      return key === 'done'
    case STATES.NEXT:
      return key === 'done'
    case STATES.DAY_DONE:
      return key === 'done'
    default:
      return false
  }
}

// Six stages of the loop shown in the "Scenario progress" panel — a coarser
// view over the device states, for the explanatory scaffolding only.
export const STAGES = Object.freeze([
  'setup',
  'waiting',
  'prompted',
  'taking',
  'confirmed',
  'planned',
])

export function stageForState(state) {
  switch (state) {
    case STATES.SETUP_SCAN:
    case STATES.SETUP_REVIEW:
    case STATES.SETUP_LOAD:
    case STATES.SETUP_LOADED:
      return 'setup'
    case STATES.QUIET:
    case STATES.DID_I_TAKE_IT:
      return 'waiting'
    case STATES.CHANGE:
    case STATES.ROUTINE_UPDATED:
    case STATES.DUE:
    case STATES.DEFERRED:
      return 'prompted'
    case STATES.DOSE:
    case STATES.INFO:
      return 'taking'
    case STATES.CONFIRMED:
      return 'confirmed'
    case STATES.NEXT:
    case STATES.DAY_DONE:
      return 'planned'
    default:
      return 'waiting'
  }
}
