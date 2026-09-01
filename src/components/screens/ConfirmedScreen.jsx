import React from 'react'
import AudioCue from '../AudioCue.jsx'
import ConfirmRing from '../ConfirmRing.jsx'

export default function ConfirmedScreen({ count, timeLabel, nextLabel }) {
  return (
    <div className="screen screen--confirmed">
      <AudioCue label="soft chime" />
      <ConfirmRing />
      <p className="screen-headline screen-headline--confirmed">
        All {count} taken · {timeLabel}
      </p>
      <p className="screen-detail">Recorded. {nextLabel}</p>
    </div>
  )
}
