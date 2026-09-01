import React, { useEffect, useState } from 'react'
import { formatClock } from '../../../_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/_ds_bundle.js'

export default function QuietScreen({ nextTime }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="screen screen--quiet">
      <div className="quiet-clock">{formatClock(now)}</div>
      <p className="screen-detail">Nothing to take until {nextTime}.</p>
    </div>
  )
}
