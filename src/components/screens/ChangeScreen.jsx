import React from 'react'
import AudioCue from '../AudioCue.jsx'

export default function ChangeScreen({ change }) {
  return (
    <div className="screen screen--change">
      <AudioCue label="soft chime" />
      <span className="change-tag">Something changed</span>
      <p className="screen-detail">{change.summary}</p>
      <p className="change-line">
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
    </div>
  )
}
