// Sample regimen for the prototype. No backend — this is the entire
// "pharmacy record" the background-system panel narrates syncing,
// collapsing, and sequencing. Scenario-specific variants (a dosage changed,
// a medication discontinued) live here too, so the state machine never
// needs to know about medication data — it only ever calls
// `itemsForBlock(block, scenario)`.

import { SCENARIOS } from './stateMachine.js'

export const USER_NAME = 'Alex'

const metformin = {
  id: 'metformin',
  name: 'Metformin',
  strength: '500 mg',
  form: 'tablet',
  instruction: 'Take with food',
  purpose: 'Helps your body use insulin properly to manage blood sugar.',
  when: 'Morning, with breakfast',
  how: 'One tablet',
  prescriptionRef: 'Rx 48213',
}

const ramipril = {
  id: 'ramipril',
  name: 'Ramipril',
  strength: '10 mg',
  form: 'tablet',
  instruction: 'Take at the same time each day',
  purpose: 'Relaxes blood vessels to keep blood pressure in a healthy range.',
  when: 'Morning',
  how: 'One tablet',
  prescriptionRef: 'Rx 51032',
}

// The medication-change scenario's updated dosage for the medication above —
// same prescription, new strength, once the change has taken effect.
const ramprilChanged = {
  ...ramipril,
  id: 'ramipril-changed',
  strength: '5 mg',
}

const atorvastatin = {
  id: 'atorvastatin',
  name: 'Atorvastatin',
  strength: '20 mg',
  form: 'tablet',
  instruction: 'Take with or without food',
  purpose: 'Lowers cholesterol to help protect your heart.',
  when: 'Afternoon',
  how: 'One tablet',
  prescriptionRef: 'Rx 39871',
}

// Sample evening medication — demonstrates the routine spans a full day,
// not just a morning block.
const melatonin = {
  id: 'melatonin',
  name: 'Melatonin',
  strength: '3 mg',
  form: 'tablet',
  instruction: 'Take 30 minutes before bed',
  purpose: 'A sample evening medication, used here to help you settle to sleep.',
  when: 'Evening',
  how: 'One tablet',
  prescriptionRef: 'Rx 72340',
}

const MEDS = { metformin, ramipril, 'ramipril-changed': ramprilChanged, atorvastatin, melatonin }

export function medById(id) {
  return MEDS[id] ?? null
}

// ---- block scheduling (shared across scenarios) ----

export const BLOCK_TIMES = { morning: '8:00 am', afternoon: '1:00 pm', evening: '9:00 pm' }
export const BLOCK_ORDER = ['morning', 'afternoon', 'evening']

export function blockLabel(block) {
  return block.charAt(0).toUpperCase() + block.slice(1)
}

export function blockTime(block) {
  return BLOCK_TIMES[block]
}

// ---- scenario-specific regimen ----
// The standard day: two morning medications, one in the afternoon, one in
// the evening — every scenario uses this except the medication-change
// scenario, where Ramipril's dosage has changed and Melatonin has been
// discontinued.

const MORNING_STANDARD = ['metformin', 'ramipril']
const AFTERNOON_STANDARD = ['atorvastatin']
const EVENING_STANDARD = ['melatonin']

const MORNING_BY_SCENARIO = {
  [SCENARIOS.CHANGE]: ['metformin', 'ramipril-changed'],
}
const EVENING_BY_SCENARIO = {
  [SCENARIOS.CHANGE]: [], // melatonin discontinued
}

export function itemsForBlock(block, scenario) {
  if (block === 'morning') return MORNING_BY_SCENARIO[scenario] ?? MORNING_STANDARD
  if (block === 'afternoon') return AFTERNOON_STANDARD
  return EVENING_BY_SCENARIO[scenario] ?? EVENING_STANDARD
}

// Total medications across the whole day under a scenario's regimen — used
// by the prescription-setup screens ("N medications · Morning / Afternoon /
// Evening").
export function totalMedCount(scenario) {
  return BLOCK_ORDER.reduce((sum, block) => sum + itemsForBlock(block, scenario).length, 0)
}

// ---- prescription-change descriptors ----
// The medication-change scenario shows both a dosage change and a
// discontinued medication on one "Something changed" screen, demonstrating
// both change types without requiring the user to compare documents or
// calculate anything themselves. `old`/`new` are optional {label, value}
// pairs — a discontinued medication has no `new`.

export const CHANGES = {
  [SCENARIOS.CHANGE]: [
    {
      type: 'dosage',
      medName: 'Ramipril',
      old: { label: 'Ramipril', value: '10 mg' },
      new: { label: 'Ramipril', value: '5 mg' },
    },
    {
      type: 'discontinued',
      medName: 'Melatonin',
      old: { label: 'Melatonin', value: '3 mg' },
      new: null,
    },
  ],
}

export function changesForScenario(scenario) {
  return CHANGES[scenario] ?? []
}
