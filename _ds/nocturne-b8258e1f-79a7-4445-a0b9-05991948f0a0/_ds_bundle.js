// Nocturne design system — local stand-in bundle.
// Real bundle is synced via claude.ai design projects (see styles.css header
// comment for why it isn't present in this environment). This stub exposes
// the small set of pure helpers the prototype actually imports, so the
// import path matches what a real synced bundle would provide.

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function formatClock(date) {
  return date
    .toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    .replace(/^0/, '')
}

export const tokenVersion = 'nocturne-stand-in-0.1.0'
