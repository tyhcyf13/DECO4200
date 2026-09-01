import React from 'react'
import AudioCue from '../AudioCue.jsx'

export default function SetupReviewScreen({ pathway }) {
  const isDigital = pathway === 'digital'
  return (
    <div className="screen screen--setup">
      <AudioCue label="soft chime" />
      <h1 className="screen-headline">{isDigital ? 'Prescription received' : 'Prescription read'}</h1>
      <p className="screen-detail">
        {isDigital
          ? 'Your medication routine is ready to set up.'
          : 'Please load the medications listed.'}
      </p>
    </div>
  )
}
