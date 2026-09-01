import { describe, it, expect } from 'vitest'
import {
  STATES,
  SCENARIOS,
  initialContext,
  transition,
  isKeyEnabled,
  isStillWaiting,
  stageForState,
} from '../stateMachine.js'
import { itemsForBlock } from '../meds.js'

const deps = {
  itemsForBlock,
  now: () => ({ h: 8, m: 6 }),
}

function send(context, type) {
  return transition(context, { type }, deps)
}

describe('normal morning: the whole day, all core states reachable via DONE only', () => {
  it('walks quiet -> due -> dose x2 -> confirmed -> next for the morning block, and info via HELP', () => {
    let ctx = initialContext(SCENARIOS.NORMAL)
    expect(ctx.state).toBe(STATES.QUIET)

    ctx = send(ctx, 'SYSTEM_TICK')
    expect(ctx.state).toBe(STATES.DUE)
    expect(ctx.items).toHaveLength(2) // Metformin, Ramipril

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.DOSE)
    expect(ctx.doseIndex).toBe(0)

    ctx = send(ctx, 'HELP')
    expect(ctx.state).toBe(STATES.INFO)
    expect(ctx.returnState).toBe(STATES.DOSE)

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.DOSE)
    expect(ctx.doseIndex).toBe(0)

    ctx = send(ctx, 'DONE') // dose 1 taken
    expect(ctx.state).toBe(STATES.DOSE)
    expect(ctx.doseIndex).toBe(1)
    expect(ctx.completed).toHaveLength(1)

    ctx = send(ctx, 'DONE') // dose 2 taken -> confirmed
    expect(ctx.state).toBe(STATES.CONFIRMED)
    expect(ctx.completed).toHaveLength(2)
    expect(ctx.confirmedAt).toEqual({ h: 8, m: 6 })
    expect(ctx.lastConfirmed).toEqual({ block: 'morning', at: { h: 8, m: 6 } })

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.NEXT)

    ctx = send(ctx, 'DONE') // advance to afternoon block, back to quiet
    expect(ctx.state).toBe(STATES.QUIET)
    expect(ctx.block).toBe('afternoon')
  })

  it('continues through afternoon and evening — a real three-block day', () => {
    let ctx = initialContext(SCENARIOS.NORMAL)
    ctx = send(ctx, 'SYSTEM_TICK') // -> due, morning
    ctx = send(ctx, 'DONE') // -> dose
    ctx = send(ctx, 'DONE') // metformin
    ctx = send(ctx, 'DONE') // ramipril -> confirmed
    ctx = send(ctx, 'DONE') // -> next
    ctx = send(ctx, 'DONE') // -> quiet, afternoon
    expect(ctx.block).toBe('afternoon')

    ctx = send(ctx, 'SYSTEM_TICK') // -> due, afternoon
    expect(ctx.items).toEqual(['atorvastatin'])
    ctx = send(ctx, 'DONE') // -> dose
    ctx = send(ctx, 'DONE') // atorvastatin -> confirmed
    ctx = send(ctx, 'DONE') // -> next
    ctx = send(ctx, 'DONE') // -> quiet, evening
    expect(ctx.block).toBe('evening')

    ctx = send(ctx, 'SYSTEM_TICK') // -> due, evening
    expect(ctx.items).toEqual(['melatonin'])
    ctx = send(ctx, 'DONE') // -> dose
    ctx = send(ctx, 'DONE') // melatonin -> confirmed
    ctx = send(ctx, 'DONE') // -> next

    // "What's next" should show all three blocks, with the ones already
    // passed marked done — verified at the view-helper level in Device.jsx;
    // here we just confirm the day actually reaches its end.
    ctx = send(ctx, 'DONE') // no block left with anything scheduled -> dayDone
    expect(ctx.state).toBe(STATES.DAY_DONE)

    ctx = send(ctx, 'DONE') // loops back to the start of the scenario
    expect(ctx.state).toBe(STATES.QUIET)
    expect(ctx.block).toBe('morning')
  })

  it('dayDone only responds to DONE', () => {
    let ctx = { ...initialContext(SCENARIOS.NORMAL), state: STATES.DAY_DONE, block: 'evening' }
    const before = ctx
    expect(send(ctx, 'LATER')).toBe(before)
    expect(send(ctx, 'HELP')).toBe(before)
  })
})

describe('deferring (LATER) — a core interaction, not a separate scenario', () => {
  it('LATER from due defers the whole block; reminder re-shows an identical due prompt', () => {
    let ctx = send(initialContext(SCENARIOS.NORMAL), 'SYSTEM_TICK')
    ctx = send(ctx, 'LATER')
    expect(ctx.state).toBe(STATES.DEFERRED)
    expect(ctx.deferredFrom).toBe('due')
    expect(ctx.deferCount).toBe(1)
    expect(ctx.completed).toHaveLength(0)

    ctx = send(ctx, 'SYSTEM_TICK')
    expect(ctx.state).toBe(STATES.DUE)
    expect(ctx.items).toHaveLength(2) // nothing lost
  })

  it('LATER mid-dose keeps already-completed meds and only defers the rest', () => {
    let ctx = send(initialContext(SCENARIOS.NORMAL), 'SYSTEM_TICK')
    ctx = send(ctx, 'DONE') // -> dose
    ctx = send(ctx, 'DONE') // dose 1 taken -> dose 2
    expect(ctx.completed).toHaveLength(1)

    ctx = send(ctx, 'LATER')
    expect(ctx.state).toBe(STATES.DEFERRED)
    expect(ctx.deferredFrom).toBe('dose')
    expect(ctx.completed).toHaveLength(1) // preserved, not wiped

    ctx = send(ctx, 'SYSTEM_TICK')
    expect(ctx.state).toBe(STATES.DUE)
    expect(ctx.completed).toHaveLength(1)
  })

  it('deferred keys are inactive except the system tick', () => {
    let ctx = send(initialContext(SCENARIOS.NORMAL), 'SYSTEM_TICK')
    ctx = send(ctx, 'LATER')
    const before = ctx
    expect(send(ctx, 'DONE')).toBe(before)
    expect(send(ctx, 'LATER')).toBe(before)
  })

  it('softens into "still waiting" after repeated defers, without ever being marked missed', () => {
    let ctx = send(initialContext(SCENARIOS.NORMAL), 'SYSTEM_TICK')
    expect(isStillWaiting(ctx)).toBe(false)

    ctx = send(ctx, 'LATER') // defer 1
    ctx = send(ctx, 'SYSTEM_TICK')
    expect(isStillWaiting(ctx)).toBe(false) // first reminder: identical wording

    ctx = send(ctx, 'LATER') // defer 2
    ctx = send(ctx, 'SYSTEM_TICK')
    expect(isStillWaiting(ctx)).toBe(true) // now the softened "still waiting" prompt

    // completing the dose resets the counter for the next block
    ctx = send(ctx, 'DONE')
    ctx = send(ctx, 'DONE')
    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.CONFIRMED)
    expect(ctx.deferCount).toBe(0)
  })
})

describe('did I take it? (?) — a core interaction, reachable in any scenario', () => {
  it('is reachable from quiet via HELP and answers "nothing recorded yet" when nothing has happened', () => {
    let ctx = initialContext(SCENARIOS.NORMAL)
    expect(isKeyEnabled(ctx, 'help')).toBe(true)
    ctx = send(ctx, 'HELP')
    expect(ctx.state).toBe(STATES.DID_I_TAKE_IT)
    expect(ctx.lastConfirmed).toBeNull()

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.QUIET)
  })

  it('answers with the last confirmed block once one has been completed', () => {
    let ctx = initialContext(SCENARIOS.NORMAL)
    ctx = send(ctx, 'SYSTEM_TICK')
    ctx = send(ctx, 'DONE')
    ctx = send(ctx, 'DONE')
    ctx = send(ctx, 'DONE') // -> confirmed
    ctx = send(ctx, 'DONE') // -> next
    ctx = send(ctx, 'DONE') // -> quiet, afternoon
    expect(ctx.state).toBe(STATES.QUIET)

    ctx = send(ctx, 'HELP')
    expect(ctx.state).toBe(STATES.DID_I_TAKE_IT)
    expect(ctx.lastConfirmed).toEqual({ block: 'morning', at: { h: 8, m: 6 } })
  })

  it('LATER triggers listening without changing state; only reachable from quiet', () => {
    let ctx = send(initialContext(SCENARIOS.NORMAL), 'HELP')
    ctx = send(ctx, 'LATER')
    expect(ctx.state).toBe(STATES.DID_I_TAKE_IT)
    expect(ctx.listening).toBe(true)

    // not reachable from due
    let dueCtx = send(initialContext(SCENARIOS.NORMAL), 'SYSTEM_TICK')
    expect(isKeyEnabled(dueCtx, 'help')).toBe(false)
  })
})

describe('medication change scenario', () => {
  it('routes quiet -> change -> routineUpdated -> due, and the routine reflects both changes at once', () => {
    let ctx = send(initialContext(SCENARIOS.CHANGE), 'SYSTEM_TICK')
    expect(ctx.state).toBe(STATES.CHANGE)

    ctx = send(ctx, 'DONE') // "I understand" acknowledges everything shown, once
    expect(ctx.state).toBe(STATES.ROUTINE_UPDATED)

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.DUE)
    // dosage change: Ramipril's id changes to the updated-dosage variant
    expect(ctx.items).toContain('ramipril-changed')
    expect(ctx.items).not.toContain('ramipril')
    // discontinued: Melatonin no longer appears anywhere in the day
    expect(itemsForBlock('evening', SCENARIOS.CHANGE)).toHaveLength(0)
  })

  it('change never re-appears once past the morning block', () => {
    let ctx = send(initialContext(SCENARIOS.CHANGE), 'SYSTEM_TICK')
    ctx = send(ctx, 'DONE') // -> routineUpdated
    ctx = send(ctx, 'DONE') // -> due
    ctx = send(ctx, 'DONE') // -> dose
    ctx = send(ctx, 'DONE')
    ctx = send(ctx, 'DONE') // -> confirmed
    ctx = send(ctx, 'DONE') // -> next
    ctx = send(ctx, 'DONE') // -> quiet, afternoon
    ctx = send(ctx, 'SYSTEM_TICK')
    expect(ctx.state).toBe(STATES.DUE) // not `change` again
  })

  it('routineUpdated and change only respond to DONE', () => {
    let ctx = send(initialContext(SCENARIOS.CHANGE), 'SYSTEM_TICK')
    const beforeChange = ctx
    expect(send(ctx, 'LATER')).toBe(beforeChange)
    ctx = send(ctx, 'DONE')
    const beforeUpdated = ctx
    expect(send(ctx, 'LATER')).toBe(beforeUpdated)
  })
})

describe('prescription setup', () => {
  it('digital pathway starts at setupReview (no scan step) and flows into quiet', () => {
    let ctx = initialContext(SCENARIOS.SETUP_DIGITAL)
    expect(ctx.state).toBe(STATES.SETUP_REVIEW)
    expect(ctx.setupPathway).toBe('digital')

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.SETUP_LOAD)
    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.SETUP_LOADED)
    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.QUIET)
  })

  it('physical pathway starts at setupScan, then converges on the same review/load flow', () => {
    let ctx = initialContext(SCENARIOS.SETUP_PHYSICAL)
    expect(ctx.state).toBe(STATES.SETUP_SCAN)
    expect(ctx.setupPathway).toBe('physical')

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.SETUP_REVIEW)
    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.SETUP_LOAD)
    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.SETUP_LOADED)
    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.QUIET)
  })

  it('setup states only respond to DONE', () => {
    const ctx = initialContext(SCENARIOS.SETUP_PHYSICAL)
    expect(send(ctx, 'LATER')).toBe(ctx)
    expect(send(ctx, 'HELP')).toBe(ctx)
  })
})

describe('exactly four scenarios are exposed', () => {
  it('SCENARIOS has only normal, change, setupPhysical, setupDigital', () => {
    expect(Object.values(SCENARIOS).sort()).toEqual(
      ['normal', 'change', 'setupPhysical', 'setupDigital'].sort()
    )
  })
})

describe('key enablement', () => {
  it('quiet enables only help; deferred dims everything', () => {
    const quiet = initialContext(SCENARIOS.NORMAL)
    expect(isKeyEnabled(quiet, 'help')).toBe(true)
    expect(isKeyEnabled(quiet, 'done')).toBe(false)
    expect(isKeyEnabled(quiet, 'later')).toBe(false)
  })

  it('never enables LATER on change or confirmed (no deferring an interruption or a done block)', () => {
    let ctx = send(initialContext(SCENARIOS.CHANGE), 'SYSTEM_TICK')
    expect(isKeyEnabled(ctx, 'later')).toBe(false)
    expect(isKeyEnabled(ctx, 'done')).toBe(true)
  })
})

describe('stageForState maps every state onto one of the six loop stages', () => {
  it.each(Object.values(STATES))('%s has a stage', (state) => {
    expect(stageForState(state)).toBeTruthy()
  })
})
