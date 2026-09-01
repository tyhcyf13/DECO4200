import React from 'react'

export default function SetupLoadScreen({ med }) {
  return (
    <div className="screen screen--setup">
      <p className="screen-eyebrow">Load medication</p>
      <h1 className="dose-name">{med.name}</h1>
      <p className="dose-strength">{med.strength}</p>
      <p className="screen-detail">Place into the indicated compartment.</p>
    </div>
  )
}
