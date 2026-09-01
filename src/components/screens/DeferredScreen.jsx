import React from 'react'

export default function DeferredScreen({ reminderTime }) {
  return (
    <div className="screen screen--deferred">
      <p className="screen-detail">I will ask again at {reminderTime}.</p>
    </div>
  )
}
