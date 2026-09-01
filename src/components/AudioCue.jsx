import React from 'react'

// Visible stand-in for an audio cue the physical device would actually play.
export default function AudioCue({ label }) {
  return (
    <span className="audio-cue" aria-hidden="true">
      ♪ {label}
    </span>
  )
}
