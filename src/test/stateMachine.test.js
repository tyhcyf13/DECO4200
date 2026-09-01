import { describe, it, expect } from 'vitest'
import {
  STATES,
  SCENARIOS,
  initialContext,
  transition,
  isKeyEnabled,
  stageForState,
} from '../stateMachine.js'
import { BLOCKS } from '../meds.js'

const deps = {
  itemsForBlock: (block) => BLOCKS[block].items.map((m) => m.id),
  now: () => ({ h: 8, m: 6 }),
}

function send(context, type) {
  return transition(context, { type }, deps)
}

describe('normal morning: all eight states reachable via DONE only', () => {
  it('walks quiet -> due -> dose x3 -> confirmed -> next, and info via HELP', () => {
    let ctx = initialContext(SCENARIOS.NORMAL)
    expect(ctx.state).toBe(STATES.QUIET)

    ctx = send(ctx, 'SYSTEM_TICK')
    expect(ctx.state).toBe(STATES.DUE)
    expect(ctx.items).toHaveLength(3)

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

    ctx = send(ctx, 'DONE') // dose 2 taken
    expect(ctx.doseIndex).toBe(2)

    ctx = send(ctx, 'DONE') // dose 3 taken -> confirmed
    expect(ctx.state).toBe(STATES.CONFIRMED)
    expect(ctx.completed).toHaveLength(3)
    expect(ctx.confirmedAt).toEqual({ h: 8, m: 6 })

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.NEXT)

    ctx = send(ctx, 'DONE') // advance to afternoon block, back to quiet
    expect(ctx.state).toBe(STATES.QUIET)
    expect(ctx.block).toBe('afternoon')
  })
})

describe('full day', () => {
  it('skips a block with nothing scheduled (evening) and lands on dayDone, then loops', () => {
    let ctx = initialContext(SCENARIOS.NORMAL)
    ctx = send(ctx, 'SYSTEM_TICK') // -> due, morning
    ctx = send(ctx, 'DONE') // -> dose
    ctx = send(ctx, 'DONE') // metformin
    ctx = send(ctx, 'DONE') // ramipril
    ctx = send(ctx, 'DONE') // atorvastatin -> confirmed
    ctx = send(ctx, 'DONE') // -> next
    ctx = send(ctx, 'DONE') // -> quiet, afternoon (has 1 item)
    expect(ctx.state).toBe(STATES.QUIET)
    expect(ctx.block).toBe('afternoon')

    ctx = send(ctx, 'SYSTEM_TICK') // -> due, afternoon
    expect(ctx.items).toHaveLength(1)
    ctx = send(ctx, 'DONE') // -> dose
    ctx = send(ctx, 'DONE') // metformin-pm -> confirmed
    expect(ctx.state).toBe(STATES.CONFIRMED)

    ctx = send(ctx, 'DONE') // -> next
    ctx = send(ctx, 'DONE') // evening has nothing scheduled -> dayDone, not due/dose
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

describe('deferred morning', () => {
  it('LATER from due defers the whole block; reminder re-shows an identical due prompt', () => {
    let ctx = send(initialContext(SCENARIOS.DEFERRED), 'SYSTEM_TICK')
    ctx = send(ctx, 'LATER')
    expect(ctx.state).toBe(STATES.DEFERRED)
    expect(ctx.deferredFrom).toBe('due')
    expect(ctx.completed).toHaveLength(0)

    ctx = send(ctx, 'SYSTEM_TICK')
    expect(ctx.state).toBe(STATES.DUE)
    expect(ctx.items).toHaveLength(3) // nothing lost
  })

  it('LATER mid-dose keeps already-completed meds and only defers the rest', () => {
    let ctx = send(initialContext(SCENARIOS.DEFERRED), 'SYSTEM_TICK')
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
    let ctx = send(initialContext(SCENARIOS.DEFERRED), 'SYSTEM_TICK')
    ctx = send(ctx, 'LATER')
    const before = ctx
    expect(send(ctx, 'DONE')).toBe(before)
    expect(send(ctx, 'LATER')).toBe(before)
  })
})

describe('morning with a medication change', () => {
  it('routes quiet -> change -> due, and never re-enters change on a later block', () => {
    let ctx = send(initialContext(SCENARIOS.CHANGE), 'SYSTEM_TICK')
    expect(ctx.state).toBe(STATES.CHANGE)

    ctx = send(ctx, 'DONE')
    expect(ctx.state).toBe(STATES.DUE)
  })
})

describe('key enablement', () => {
  it('dims all keys in quiet and deferred', () => {
    const quiet = initialContext(SCENARIOS.NORMAL)
    expect(isKeyEnabled(quiet, 'done')).toBe(false)
    expect(isKeyEnabled(quiet, 'later')).toBe(false)
    expect(isKeyEnabled(quiet, 'help')).toBe(false)
  })

  it('never enables LATER on change or confirmed (no deferring an interruption or a done block)', () => {
    let ctx = send(initialContext(SCENARIOS.CHANGE), 'SYSTEM_TICK')
    expect(isKeyEnabled(ctx, 'later')).toBe(false)
    expect(isKeyEnabled(ctx, 'done')).toBe(true)
  })
})

describe('stageForState maps all eight states onto the five loop stages', () => {
  it.each(Object.values(STATES))('%s has a stage', (state) => {
    expect(stageForState(state)).toBeTruthy()
  })
})
