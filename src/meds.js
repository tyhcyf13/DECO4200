// Sample regimen for the prototype. No backend — this is the entire
// "pharmacy record" the background-system panel narrates syncing,
// collapsing, and sequencing. Scenario-specific variants (a medication
// added, discontinued, or changed) live here too, so the state machine
// never needs to know about medication data — it only ever calls
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

const atorvastatin = {
  id: 'atorvastatin',
  name: 'Atorvastatin',
  strength: '20 mg',
  form: 'tablet',
  instruction: 'Take with or without food',
  purpose: 'Lowers cholesterol to help protect your heart.',
  when: 'Morning',
  how: 'One tablet',
  prescriptionRef: 'Rx 39871',
}

// Only used by the "new medication" change scenario.
const aspirin = {
  id: 'aspirin',
  name: 'Aspirin',
  strength: '100 mg',
  form: 'tablet',
  instruction: 'Take with food',
  purpose: 'Helps prevent blood clots.',
  when: 'Morning',
  how: 'One tablet',
  prescriptionRef: 'Rx 60214',
}

const metforminPM = {
  ...metformin,
  id: 'metformin-pm',
  when: 'Afternoon, with lunch',
}

const MEDS = { metformin, ramipril, atorvastatin, aspirin, metforminPM }

export function medById(id) {
  return MEDS[id] ?? MEDS[id?.replace(/-pm$/, '')] ?? null
}

// ---- block scheduling (shared across scenarios) ----

export const BLOCK_TIMES = { morning: '8:00 am', afternoon: '1:00 pm', evening: '6:00 pm' }
export const BLOCK_ORDER = ['morning', 'afternoon', 'evening']

export function blockLabel(block) {
  return block.charAt(0).toUpperCase() + block.slice(1)
}

export function blockTime(block) {
  return BLOCK_TIMES[block]
}

// ---- scenario-specific morning regimen ----
// Every scenario other than the ones listed below uses the standard
// three-medication morning routine.

const MORNING_STANDARD = ['metformin', 'ramipril', 'atorvastatin']
const MORNING_BY_SCENARIO = {
  [SCENARIOS.CHANGE_NEW]: [...MORNING_STANDARD, 'aspirin'],
  [SCENARIOS.CHANGE_DISCONTINUED]: ['metformin', 'ramipril'], // atorvastatin discontinued
}

const AFTERNOON_STANDARD = ['metformin-pm']
const EVENING_STANDARD = []

export function itemsForBlock(block, scenario) {
  if (block === 'morning') return MORNING_BY_SCENARIO[scenario] ?? MORNING_STANDARD
  if (block === 'afternoon') return AFTERNOON_STANDARD
  return EVENING_STANDARD
}

// ---- prescription-change descriptors ----
// Each describes what the `change` and `routineUpdated` screens show. `old`
// and `new` are optional {label, value} pairs — a new medication has no
// `old`, a discontinued one has no `new`.

export const CHANGES = {
  [SCENARIOS.CHANGE_DOSAGE]: {
    type: 'dosage',
    medName: 'Ramipril',
    summary: 'Your doctor increased your Ramipril dose.',
    old: { label: 'Ramipril', value: '5 mg' },
    new: { label: 'Ramipril', value: '10 mg' },
    resultLine: 'Every morning',
  },
  [SCENARIOS.CHANGE_NEW]: {
    type: 'new',
    medName: 'Aspirin',
    summary: 'A new medication was added to your morning routine.',
    old: null,
    new: { label: 'Aspirin', value: '100 mg' },
    resultLine: 'Every morning',
  },
  [SCENARIOS.CHANGE_DISCONTINUED]: {
    type: 'discontinued',
    medName: 'Atorvastatin',
    summary: 'Atorvastatin has been discontinued.',
    old: { label: 'Atorvastatin', value: '20 mg' },
    new: null,
    resultLine: null,
  },
}

// ---- setup-scenario demo medication ----
// Both prescription-setup scenarios walk through onboarding this one
// medication (the first in the standard morning routine), then flow into
// the normal routine.

export const SETUP_MED = metformin
