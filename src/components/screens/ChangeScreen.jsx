import React from 'react'
import AudioCue from '../AudioCue.jsx'

// Shows every change at once (a dosage change, a discontinued medication —
// whatever applies) under one acknowledgement, rather than making the user
// step through and confirm each individually. Nothing here requires the
// user to calculate or compare anything themselves.
export default function ChangeScreen({ changes }) {
  return (
    <div className="screen screen--change">
      <AudioCue label="soft chime" />
      <span className="change-tag">Something changed</span>
      <p className="screen-detail">Your prescription has changed.</p>
      <div className="change-lines">
        {changes.map((change) => (
          <p className="change-line" key={change.medName}>
            {change.old && (
              <span className="change-line__old">
                {change.old.label} {change.old.value}
              </span>
            )}
            {change.new && (
              <span className="change-line__new">
                {change.new.label} {change.new.value}
              </span>
            )}
          </p>
        ))}
      </div>
      <p className="screen-detail">Takes effect tomorrow morning.</p>
    </div>
  )
}
