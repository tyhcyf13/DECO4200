import React from 'react'
import AudioCue from '../AudioCue.jsx'

export default function InfoScreen({ med, listening }) {
  return (
    <div className="screen screen--info">
      {listening && <AudioCue label="reading aloud" />}
      <p className="screen-eyebrow">{med.name}</p>
      <p className="screen-detail">{med.purpose}</p>
      <dl className="info-facts">
        <div className="info-facts__row">
          <dt>When</dt>
          <dd>{med.when}</dd>
        </div>
        <div className="info-facts__row">
          <dt>How much</dt>
          <dd>{med.how}</dd>
        </div>
      </dl>
    </div>
  )
}
