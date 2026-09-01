import React from 'react'

export default function SetupLoadScreen({ count }) {
  const plural = count === 1 ? 'medication' : 'medications'
  return (
    <div className="screen screen--setup">
      <h1 className="screen-headline">Load your medications</h1>
      <p className="screen-detail">
        {count} {plural} · Morning / Afternoon / Evening
      </p>
    </div>
  )
}
