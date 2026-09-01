// Sample regimen for the prototype. No backend — this is the entire "pharmacy
// record" the background-system panel narrates syncing, collapsing, and
// sequencing.

export const USER_NAME = 'Alex'

export const MORNING_MEDS = [
  {
    id: 'metformin',
    name: 'Metformin',
    strength: '500 mg',
    form: 'tablet',
    instruction: 'Take with food',
    purpose: 'Helps your body use insulin properly to manage blood sugar.',
    when: 'Morning, with breakfast',
    how: 'One tablet',
    prescriptionRef: 'Rx 48213',
  },
  {
    id: 'ramipril',
    name: 'Ramipril',
    strength: '10 mg',
    form: 'tablet',
    instruction: 'Take at the same time each day',
    purpose: 'Relaxes blood vessels to keep blood pressure in a healthy range.',
    when: 'Morning',
    how: 'One tablet',
    prescriptionRef: 'Rx 51032',
  },
  {
    id: 'atorvastatin',
    name: 'Atorvastatin',
    strength: '20 mg',
    form: 'tablet',
    instruction: 'Take with or without food',
    purpose: 'Lowers cholesterol to help protect your heart.',
    when: 'Morning',
    how: 'One tablet',
    prescriptionRef: 'Rx 39871',
  },
]

export const AFTERNOON_MEDS = [
  {
    id: 'metformin-pm',
    name: 'Metformin',
    strength: '500 mg',
    form: 'tablet',
    instruction: 'Take with food',
    purpose: 'Helps your body use insulin properly to manage blood sugar.',
    when: 'Afternoon, with lunch',
    how: 'One tablet',
    prescriptionRef: 'Rx 48213',
  },
]

export const EVENING_MEDS = []

export const BLOCKS = {
  morning: { key: 'morning', label: 'Morning', time: '8:00 am', items: MORNING_MEDS },
  afternoon: { key: 'afternoon', label: 'Afternoon', time: '1:00 pm', items: AFTERNOON_MEDS },
  evening: { key: 'evening', label: 'Evening', time: '6:00 pm', items: EVENING_MEDS },
}

export const BLOCK_ORDER = ['morning', 'afternoon', 'evening']

// The interruption shown by the "morning with a medication change" scenario.
export const MEDICATION_CHANGE = {
  medId: 'ramipril',
  medName: 'Ramipril',
  summary: "Your doctor increased your Ramipril dose.",
  from: '5 mg',
  to: '10 mg',
}

export function medById(id) {
  for (const block of Object.values(BLOCKS)) {
    const found = block.items.find((m) => m.id === id)
    if (found) return found
  }
  return null
}
