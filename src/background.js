// Narrates the state machine as the "happening in the background" log. Kept
// separate from stateMachine.js so the interaction model stays free of any
// knowledge of med names, prescriptions, or copy — this module is the only
// place that turns a transition into a sentence.

import { STATES, SCENARIOS } from './stateMachine.js'
import { MEDICATION_CHANGE } from './meds.js'
import { reminderTimeFor, capitalize } from './timeUtils.js'

const SUPPLY = {
  metformin: { label: 'Metformin', remaining: 58 },
  ramipril: { label: 'Ramipril', remaining: 29 },
  atorvastatin: { label: 'Atorvastatin', remaining: 44 },
}

export function initialLogLines(scenario) {
  const lines = [
    'Pharmacy record synced.',
    'Three prescriptions collapsed into one morning block.',
    'Dose sequence chosen — Metformin first (with food).',
  ]
  if (scenario === SCENARIOS.CHANGE) {
    lines.push(
      `Prescription update received — ${MEDICATION_CHANGE.medName} ${MEDICATION_CHANGE.from} → ${MEDICATION_CHANGE.to}.`
    )
  }
  return lines
}

/**
 * @param {object} deps deps.medLookup(id) -> { name, prescriptionRef }
 */
export function describeTransition(prevContext, event, nextContext, deps) {
  const { medLookup } = deps
  const lines = []

  if (prevContext.state === STATES.CHANGE && event.type === 'DONE') {
    lines.push('Change acknowledged by user.')
  }

  if (
    (prevContext.state === STATES.DUE || prevContext.state === STATES.DOSE) &&
    event.type === 'LATER'
  ) {
    lines.push(`${capitalize(prevContext.block)} block held open — not marked missed.`)
    lines.push(`Reminder scheduled for ${reminderTimeFor(prevContext.block)}.`)
  }

  if (prevContext.state === STATES.DOSE && event.type === 'DONE') {
    const medId = prevContext.items[prevContext.doseIndex]
    const med = medLookup(medId)
    if (med) {
      lines.push(`${med.name} marked taken — matched to ${med.prescriptionRef}.`)
    }
  }

  if (nextContext.state === STATES.CONFIRMED && prevContext.state !== STATES.CONFIRMED) {
    const supplyLine = nextContext.completed
      .map((id) => {
        const s = SUPPLY[baseId(id)]
        return s ? `${s.label} ${s.remaining} remaining` : null
      })
      .filter(Boolean)
      .join(', ')
    lines.push(`Adherence recorded for ${nextContext.block} block.`)
    if (supplyLine) lines.push(`Supply count decremented — ${supplyLine}.`)
    lines.push('Refill forecast updated — 19 days remaining.')
  }

  if (prevContext.state === STATES.CONFIRMED && event.type === 'DONE') {
    const nextBlock = nextContext.block !== prevContext.block ? nextContext.block : null
    if (nextBlock) {
      lines.push(`${capitalize(nextBlock)} block armed for ${reminderTimeFor(nextBlock)}.`)
    }
  }

  if (nextContext.state === STATES.DAY_DONE && prevContext.state !== STATES.DAY_DONE) {
    lines.push('All scheduled blocks complete for today.')
  }

  return lines
}

function baseId(id) {
  return id.replace(/-pm$/, '')
}
