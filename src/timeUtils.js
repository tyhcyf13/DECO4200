// The one place block times and reminder offsets are named, so the machine
// and the background narrator never disagree with the device screens.

export function reminderTimeFor(block) {
  if (block === 'morning') return '8:30'
  if (block === 'afternoon') return '1:00 pm'
  return '6:00 pm'
}

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// { h: 8, m: 6 } -> "8:06 am"
export function formatStamp(stamp) {
  if (!stamp) return ''
  const period = stamp.h >= 12 ? 'pm' : 'am'
  const h12 = ((stamp.h + 11) % 12) + 1
  return `${h12}:${String(stamp.m).padStart(2, '0')} ${period}`
}

const BLOCK_START = {
  morning: { h: 8, m: 0 },
  afternoon: { h: 13, m: 0 },
  evening: { h: 18, m: 0 },
}

// A deterministic "a few minutes in" stamp used when a block is confirmed —
// simulated, not read from the real clock, so the demo stays coherent
// regardless of when it's actually run.
export function confirmedTimeFor(block) {
  const start = BLOCK_START[block] ?? BLOCK_START.morning
  let m = start.m + 6
  let h = start.h
  if (m >= 60) {
    m -= 60
    h += 1
  }
  return { h, m }
}
