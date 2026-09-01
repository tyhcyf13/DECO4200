import React from 'react'
import AudioCue from '../AudioCue.jsx'

export default function ChangeScreen({ change }) {
  return (
    <div className="screen screen--change">
      <AudioCue label="soft chime" />
      <span className="change-tag">Something changed</span>
      <p className="screen-detail">{change.summary}</p>
      <p className="change-line">
        <span className="change-line__old">
          {change.medName} {change.from}
        </span>
        <span className="change-line__new">
          {change.medName} {change.to}
        </span>
      </p>
    </div>
  )
}
