import React from 'react'
import ConfirmRing from '../ConfirmRing.jsx'

export default function SetupLoadedScreen() {
  return (
    <div className="screen screen--confirmed">
      <ConfirmRing />
      <p className="screen-headline screen-headline--confirmed">Medication loaded</p>
      <p className="screen-detail">Morning routine updated.</p>
    </div>
  )
}
