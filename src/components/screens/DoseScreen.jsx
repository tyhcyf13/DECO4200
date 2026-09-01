import React from 'react'

export default function DoseScreen({ index, total, blockLabel, med, pips }) {
  return (
    <div className="screen screen--dose">
      <p className="screen-eyebrow">
        {index} of {total} this {blockLabel.toLowerCase()}
      </p>
      <h1 className="dose-name">{med.name}</h1>
      <p className="dose-strength">{med.strength}</p>
      <p className="screen-detail">{med.instruction}</p>
      <div className="pips" role="presentation">
        {pips.map((state, i) => (
          <span key={i} className={`pip pip--${state}`} />
        ))}
      </div>
    </div>
  )
}
