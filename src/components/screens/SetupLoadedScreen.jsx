import React from 'react'
import ConfirmRing from '../ConfirmRing.jsx'

export default function SetupLoadedScreen({ firstDoseTime }) {
  return (
    <div className="screen screen--confirmed">
      <ConfirmRing />
      <p className="screen-headline screen-headline--confirmed">Routine ready</p>
      <p className="screen-detail">Your first dose is due at {firstDoseTime}.</p>
    </div>
  )
}
