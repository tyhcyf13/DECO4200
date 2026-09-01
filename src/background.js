// Narrates the state machine as the "happening in the background" log. Kept
// separate from stateMachine.js so the interaction model stays free of any
// knowledge of med names, prescriptions, or copy — this module is the only
// place that turns a transition into a sentence.
//
// Every line is tagged 'digital' or 'physical' — this is what makes the
// digital/physical relationship legible in the background panel: digital
// entries are the system organising complexity behind the scenes; physical
// entries are moments where something tangible happened at the device.

import { STATES, SCENARIOS } from './stateMachine.js'
import { CHANGES, SETUP_MED } from './meds.js'
import { reminderTimeFor, capitalize } from './timeUtils.js'

const SUPPLY = {
  metformin: { label: 'Metformin', remaining: 58 },
  ramipril: { label: 'Ramipril', remaining: 29 },
  atorvastatin: { label: 'Atorvastatin', remaining: 44 },
  aspirin: { label: 'Aspirin', remaining: 30 },
}

function d(text) {
  return { text, domain: 'digital' }
}
function p(text) {
  return { text, domain: 'physical' }
}

export function initialLogLines(scenario) {
  if (scenario === SCENARIOS.SETUP_PHYSICAL || scenario === SCENARIOS.SETUP_DIGITAL) {
    return scenario === SCENARIOS.SETUP_DIGITAL
      ? [d(`Verified prescription received for ${SETUP_MED.name}.`)]
      : []
  }

  const lines = [
    d('Pharmacy record synced.'),
    d('Three prescriptions collapsed into one morning block.'),
    d('Dose sequence chosen — Metformin first (with food).'),
  ]

  const change = CHANGES[scenario]
  if (change) {
    lines.push(d('New prescription received.'), d('Existing routine compared.'), d(changeSummaryLine(change)))
  }

  if (scenario === SCENARIOS.CHECK_STATUS) {
    lines.push(d('Morning dose confirmed at 8:06 am.'))
  }

  return lines
}

function changeSummaryLine(change) {
  if (change.type === 'dosage') {
    return `${change.old.label} dosage changed: ${change.old.value} → ${change.new.value}.`
  }
  if (change.type === 'new') {
    return `${change.new.label} added to morning routine.`
  }
  return `${change.old.label} discontinued.`
}

/**
 * @param {object} deps deps.medLookup(id) -> { name, prescriptionRef }
 */
export function describeTransition(prevContext, event, nextContext, deps) {
  const { medLookup } = deps
  const lines = []

  // ---- setup flow (prescription -> medication -> routine) ----

  if (prevContext.state === STATES.SETUP_SCAN && event.type === 'DONE') {
    lines.push(p('Prescription scanned.'), d('Medication information extracted.'))
  }
  if (prevContext.state === STATES.SETUP_REVIEW && event.type === 'DONE') {
    lines.push(d(`${SETUP_MED.name} added to routine.`))
  }
  if (prevContext.state === STATES.SETUP_LOAD && event.type === 'DONE') {
    lines.push(p(`${SETUP_MED.name} loaded into compartment.`))
  }
  if (prevContext.state === STATES.SETUP_LOADED && event.type === 'DONE') {
    lines.push(d('Morning routine prepared.'))
  }

  // ---- prescription change ----

  if (prevContext.state === STATES.CHANGE && event.type === 'DONE') {
    lines.push(d('User informed.'))
  }
  if (prevContext.state === STATES.ROUTINE_UPDATED && event.type === 'DONE') {
    lines.push(d('Routine updated.'))
  }

  // ---- due / deferred ----

  if (
    prevContext.state === STATES.QUIET &&
    event.type === 'SYSTEM_TICK' &&
    (nextContext.state === STATES.DUE || nextContext.state === STATES.CHANGE)
  ) {
    lines.push(p(`${capitalize(nextContext.block)} dose due.`))
  }

  if (
    (prevContext.state === STATES.DUE || prevContext.state === STATES.DOSE) &&
    event.type === 'LATER'
  ) {
    lines.push(d(`${capitalize(prevContext.block)} block held open — not marked missed.`))
    lines.push(d(`Reminder scheduled for ${reminderTimeFor(prevContext.block)}.`))
  }

  if (prevContext.state === STATES.DUE && event.type === 'DONE') {
    lines.push(p(`${capitalize(prevContext.block)} medication presented.`))
  }

  if (prevContext.state === STATES.DOSE && event.type === 'DONE') {
    const medId = prevContext.items[prevContext.doseIndex]
    const med = medLookup(medId)
    if (med) {
      lines.push(p(`${med.name} marked taken — matched to ${med.prescriptionRef}.`))
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
    lines.push(d(`Adherence recorded for ${nextContext.block} block.`))
    if (supplyLine) lines.push(d(`Supply count decremented — ${supplyLine}.`))
    lines.push(d('Refill forecast updated — 19 days remaining.'))
  }

  if (prevContext.state === STATES.CONFIRMED && event.type === 'DONE') {
    const nextBlock = nextContext.block !== prevContext.block ? nextContext.block : null
    if (nextBlock) {
      lines.push(d(`${capitalize(nextBlock)} block armed for ${reminderTimeFor(nextBlock)}.`))
    }
  }

  if (nextContext.state === STATES.DAY_DONE && prevContext.state !== STATES.DAY_DONE) {
    lines.push(d('All scheduled blocks complete for today.'))
  }

  return lines
}

function baseId(id) {
  return id.replace(/-pm$/, '')
}
