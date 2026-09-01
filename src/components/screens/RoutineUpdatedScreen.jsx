import React from 'react'

export default function RoutineUpdatedScreen({ change }) {
  const discontinued = change.type === 'discontinued'
  return (
    <div className="screen screen--routine-updated">
      <h1 className="screen-headline">Routine updated</h1>
      {discontinued ? (
        <p className="screen-detail">{change.old.label} removed from your morning routine.</p>
      ) : (
        <>
          <p className="dose-strength">
            {change.new.label} {change.new.value}
          </p>
          <p className="screen-detail">{change.resultLine}</p>
        </>
      )}
    </div>
  )
}
