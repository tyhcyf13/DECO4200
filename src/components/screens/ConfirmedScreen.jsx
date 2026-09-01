import React from 'react'
import AudioCue from '../AudioCue.jsx'

export default function ConfirmedScreen({ count, timeLabel, nextLabel }) {
  return (
    <div className="screen screen--confirmed">
      <AudioCue label="soft chime" />
      <div className="confirm-ring" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r="28" className="confirm-ring__track" />
          <circle cx="32" cy="32" r="28" className="confirm-ring__progress" />
          <path d="M20 33 L28 41 L45 23" className="confirm-ring__tick" />
        </svg>
      </div>
      <p className="screen-headline screen-headline--confirmed">
        All {count} taken · {timeLabel}
      </p>
      <p className="screen-detail">Recorded. {nextLabel}</p>
    </div>
  )
}
