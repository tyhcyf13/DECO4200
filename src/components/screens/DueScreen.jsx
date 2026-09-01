import React from 'react'
import AudioCue from '../AudioCue.jsx'

const GREETING = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' }

export default function DueScreen({ userName, block, remaining, items, stillWaiting }) {
  const plural = remaining === 1 ? 'medication' : 'medications'
  return (
    <div className="screen screen--due">
      {!stillWaiting && <AudioCue label="soft chime" />}
      {stillWaiting ? (
        <>
          <h1 className="screen-headline">Your {block} medication is still waiting.</h1>
          <p className="screen-detail">Would you like to take it now?</p>
        </>
      ) : (
        <>
          <h1 className="screen-headline">
            {GREETING[block] ?? 'Hello'}, {userName}
          </h1>
          <p className="screen-detail">
            {remaining} {plural} to take now
          </p>
        </>
      )}
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
