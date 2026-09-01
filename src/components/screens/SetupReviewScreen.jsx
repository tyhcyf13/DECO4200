import React from 'react'
import AudioCue from '../AudioCue.jsx'

export default function SetupReviewScreen({ pathway, med }) {
  const isDigital = pathway === 'digital'
  return (
    <div className="screen screen--setup">
      <AudioCue label="soft chime" />
      <p className="screen-eyebrow">
        {isDigital ? 'Prescription received · verified by your pharmacy' : 'Prescription detected'}
      </p>
      <h1 className="dose-name">{med.name}</h1>
      <p className="dose-strength">
        {med.strength} · {med.when}
      </p>
      <p className="screen-detail">{med.instruction}</p>
    </div>
  )
}
