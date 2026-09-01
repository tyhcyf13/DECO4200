import React from 'react'

export default function DayDoneScreen({ nextTime }) {
  return (
    <div className="screen screen--day-done">
      <h1 className="screen-headline">All done for today</h1>
      <p className="screen-detail">Nothing more to take. New day starts at {nextTime}.</p>
    </div>
  )
}
