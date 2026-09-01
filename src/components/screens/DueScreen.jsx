import React from 'react'
import AudioCue from '../AudioCue.jsx'

const GREETING = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' }

export default function DueScreen({ userName, block, remaining, items }) {
  const plural = remaining === 1 ? 'medication' : 'medications'
  return (
    <div className="screen screen--due">
      <AudioCue label="soft chime" />
      <h1 className="screen-headline">
        {GREETING[block] ?? 'Hello'}, {userName}
      </h1>
      <p className="screen-detail">
        {remaining} {plural} to take now
      </p>
      <ul className="med-list">
        {items.map((m) => (
          <li key={m.id} className="med-list__item">
            <span className="med-list__name">{m.name}</span>
            <span className="med-list__strength">{m.strength}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
