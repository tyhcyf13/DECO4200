import React from 'react'
import AudioCue from '../AudioCue.jsx'
import { capitalize, formatStamp } from '../../timeUtils.js'

export default function DidITakeItScreen({ lastConfirmed, nextTime, listening }) {
  return (
    <div className="screen screen--did-i-take-it">
      {listening && <AudioCue label="reading aloud" />}
      {lastConfirmed ? (
        <>
          <p className="screen-eyebrow">{capitalize(lastConfirmed.block)} dose</p>
          <h1 className="screen-headline">Recorded as taken</h1>
          <p className="screen-detail">{formatStamp(lastConfirmed.at)}</p>
        </>
      ) : (
        <>
          <h1 className="screen-headline">Nothing recorded yet today</h1>
          <p className="screen-detail">Your next dose is at {nextTime}.</p>
        </>
      )}
    </div>
  )
}
