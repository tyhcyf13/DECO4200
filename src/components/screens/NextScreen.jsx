import React from 'react'

export default function NextScreen({ columns }) {
  return (
    <div className="screen screen--next">
      <p className="screen-eyebrow">Today</p>
      <div className="next-columns">
        {columns.map((col) => (
          <div key={col.key} className={`next-col${col.isActive ? ' next-col--active' : ''}`}>
            <p className="next-col__label">{col.label}</p>
            <p className="next-col__count">
              {col.count} {col.count === 1 ? 'medication' : 'medications'}
            </p>
            <div className="next-col__bar">
              <div className="next-col__fill" style={{ height: `${col.fillPct}%` }} />
            </div>
            <p className="next-col__status">{col.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
