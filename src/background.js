// Narrates the state machine as the "happening in the background" log. Kept
// separate from stateMachine.js so the interaction model stays free of any
// knowledge of med names, prescriptions, or copy — this module is the only
// place that turns a transition into a sentence.
//
// Every line is tagged 'digital' or 'physical' — this is what makes the
// digital/physical relationship legible in the background panel: digital
// entries are the system organising complexity behind the scenes; physical
// entries are moments where something tangible happened at the device (a
// scan, a chime, medication loaded or taken).

import { STATES, SCENARIOS } from './stateMachine.js'
import { changesForScenario, itemsForBlock } from './meds.js'
import { reminderTimeFor, capitalize } from './timeUtils.js'

const SUPPLY = {
  metformin: { label: 'Metformin', remaining: 58 },
  ramipril: { label: 'Ramipril', remaining: 29 },
  atorvastatin: { label: 'Atorvastatin', remaining: 44 },
  amlodipine: { label: 'Amlodipine', remaining: 33 },
  omeprazole: { label: 'Omeprazole', remaining: 27 },
}

function d(text) {
  return { text, domain: 'digital' }
}
function p(text) {
  return { text, domain: 'physical' }
}

export function initialLogLines(scenario) {
  if (scenario === SCENARIOS.SETUP_DIGITAL) {
    return [d('Prescription received from pharmacist.'), d('Prescription verified.')]
  }
  if (scenario === SCENARIOS.SETUP_PHYSICAL) {
    return [] // nothing has happened yet — the user hasn't scanned anything
  }

  // Counts describe the original, pre-change regimen — the baseline the
  // pharmacy set up — even for the medication-change scenario, whose
  // discontinued item hasn't been revealed to the user yet at this point.
  const medCount = (block) => itemsForBlock(block, SCENARIOS.NORMAL).length
  const lines = [
    d('Five prescriptions received and verified.'),
    d('Prescriptions consolidated into three daily medication blocks.'),
    d(`Morning sequence created — ${medCount('morning')} medications.`),
    d(`Afternoon sequence created — ${medCount('afternoon')} medications.`),
    d(`Evening sequence created — ${medCount('evening')} medication${medCount('evening') === 1 ? '' : 's'}.`),
  ]

  if (scenario === SCENARIOS.CHANGE) {
    lines.push(d('Updated prescription received.'), d('Existing routine compared.'))
    changesForScenario(scenario).forEach((change) => lines.push(d(changeSummaryLine(change))))
  }

  return lines
}

function changeSummaryLine(change) {
  if (change.type === 'dosage') {
    return `${change.old.label} dosage changed: ${change.old.value} → ${change.new.value}.`
  }
  return `${change.old.label} discontinued.`
}

/**
 * @param {object} deps deps.medLookup(id) -> { name, prescriptionRef }
 */
export function describeTransition(prevContext, event, nextContext, deps) {
  const { medLookup } = deps
  const lines = []

  // ---- prescription setup (scan/receive -> load -> ready) ----

  if (prevContext.state === STATES.SETUP_SCAN && event.type === 'DONE') {
    lines.push(
      p('Physical prescription detected.'),
      d('Prescription information read.'),
      d('Medication instructions extracted.'),
      d('Prescription verified against pharmacy record.')
    )
  }

  if (prevContext.state === STATES.SETUP_REVIEW && event.type === 'DONE') {
    if (prevContext.setupPathway === 'digital') {
      lines.push(
        d('Routine transmitted securely.'),
        d('Medication schedule created.'),
        d('Medication loading required.')
      )
    } else {
      lines.push(d('Routine created.'), d('Medication loading required.'))
    }
  }

  if (prevContext.state === STATES.SETUP_LOAD && event.type === 'DONE') {
    lines.push(p('Routine ready.'))
  }

  // ---- prescription change ----

  if (
    prevContext.state === STATES.QUIET &&
    event.type === 'SYSTEM_TICK' &&
    nextContext.state === STATES.CHANGE
  ) {
    lines.push(d('User notified.'))
  }

  if (prevContext.state === STATES.CHANGE && event.type === 'DONE') {
    lines.push(d('Previous instruction retained until change takes effect.'), d('New routine scheduled.'))
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
  return id.replace(/-pm$|-changed$/, '')
}
