import React from 'react'

// Shared visual confirmation motif — a dose taken, medication loaded, or any
// other successfully completed action uses the same ring+tick language.
export default function ConfirmRing() {
  return (
    <div className="confirm-ring" aria-hidden="true">
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r="28" className="confirm-ring__track" />
        <circle cx="32" cy="32" r="28" className="confirm-ring__progress" />
        <path d="M20 33 L28 41 L45 23" className="confirm-ring__tick" />
      </svg>
    </div>
  )
}
