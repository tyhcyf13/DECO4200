// The interaction model for the medication companion device, expressed as a
// pure, dependency-free state machine. No React, no timers, no DOM — this
// module is deliberately the most important file in the prototype: it is
// the thing being designed, not scaffolding around it.
//
// States
// ------
//   quiet     resting; nothing due; keys dimmed
//   change    "something changed" interruption, shown before a block that
//             has a pending prescription/dose/schedule change
//   due       a block has become due; names + dosages listed; DONE starts,
//             LATER defers the whole block
//   dose      one medication at a time within the active block
//   info      medication information for the current dose (reached only
//             from `dose`)
//   deferred  the block was deferred; screen dims; no countdown shown
//   confirmed all items in the block are taken
//   next      the "what's next" day overview
//   dayDone   every block with medications in it is complete; nothing more
//             today
//
// Events
// ------
//   DONE, LATER, HELP   mirror the three hardware keys
//   SYSTEM_TICK         the passage of time (a block becoming due, or a
//                       deferred reminder firing) — never a user action
//   SELECT_SCENARIO     load one of the three demo scenarios
//   RESTART             replay the current scenario from `quiet`

export const STATES = Object.freeze({
  QUIET: 'quiet',
  CHANGE: 'change',
  DUE: 'due',
  DOSE: 'dose',
  INFO: 'info',
  DEFERRED: 'deferred',
  CONFIRMED: 'confirmed',
  NEXT: 'next',
  DAY_DONE: 'dayDone',
})

export const SCENARIOS = Object.freeze({
  NORMAL: 'normal',
  DEFERRED: 'deferred',
  CHANGE: 'change',
})

const BLOCK_SEQUENCE = ['morning', 'afternoon', 'evening']

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
  return {
    state: STATES.QUIET,
    scenario,
    block: 'morning',
    items: [], // med ids in the active block, in dose order
    doseIndex: 0,
    completed: [], // med ids already marked done in the active block
    returnState: null, // state to return to when leaving `info`
    deferredFrom: null, // 'due' | 'dose' — which screen requested the defer
    confirmedAt: null, // { h, m } wall-clock stamp for the confirmation screen
    listening: false, // transient "reading aloud" flag on `info`
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
 * `deps.itemsForBlock(block)` returns the ordered med-id list for a block,
 * and `deps.now()` returns a { h, m } wall-clock stamp — both injected so
 * the machine has zero outside knowledge of med data or real time.
 */
export function transition(context, event, deps) {
  const { itemsForBlock, now } = deps

  switch (context.state) {
    case STATES.QUIET: {
      if (event.type === 'SYSTEM_TICK') {
        const items = itemsForBlock(context.block)
        const hasChange = context.scenario === SCENARIOS.CHANGE && context.block === 'morning'
        return {
          ...context,
          items,
          doseIndex: 0,
          completed: [],
          state: hasChange ? STATES.CHANGE : STATES.DUE,
        }
      }
      return context
    }

    case STATES.CHANGE: {
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
        return { ...context, state: STATES.DEFERRED, deferredFrom: 'due' }
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
          return {
            ...context,
            completed,
            state: STATES.CONFIRMED,
            confirmedAt: now(),
          }
        }
        return {
          ...context,
          completed,
          doseIndex: firstIncompleteIndex(context.items, completed),
        }
      }
      if (event.type === 'LATER') {
        return { ...context, state: STATES.DEFERRED, deferredFrom: 'dose' }
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
        const block = nextBlockWithItems(context.block, itemsForBlock)
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

export function isKeyEnabled(context, key) {
  switch (context.state) {
    case STATES.QUIET:
      return false
    case STATES.CHANGE:
      return key === 'done'
    case STATES.DUE:
      return key === 'done' || key === 'later'
    case STATES.DOSE:
      return true
    case STATES.INFO:
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

// Five stages of the loop shown in the "Scenario progress" panel — a coarser
// view over the eight device states, for the explanatory scaffolding only.
export const STAGES = Object.freeze(['waiting', 'prompted', 'taking', 'confirmed', 'planned'])

export function stageForState(state) {
  switch (state) {
    case STATES.QUIET:
      return 'waiting'
    case STATES.CHANGE:
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
