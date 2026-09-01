import React from 'react'
import { SCENARIOS, STAGES } from '../stateMachine.js'
import { cx } from '../../_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/_ds_bundle.js'

const SCENARIO_OPTIONS = [
  { id: SCENARIOS.NORMAL, label: 'Normal morning', hint: 'Press DONE through the routine.' },
  {
    id: SCENARIOS.DEFERRED,
    label: 'Deferred morning',
    hint: 'Press LATER on the routine or a dose, then wait for the reminder.',
  },
  {
    id: SCENARIOS.CHANGE,
    label: 'Morning with a medication change',
    hint: 'A change interruption appears first — press DONE to acknowledge.',
  },
]

const STAGE_LABEL = {
  waiting: 'Waiting',
  prompted: 'Prompted',
  taking: 'Taking',
  confirmed: 'Confirmed',
  planned: 'Planned',
}

export default function BackgroundPanel({
  scenario,
  onSelectScenario,
  stage,
  log,
  onRestart,
  canSkipWait,
  onSkipWait,
}) {
  const activeOption = SCENARIO_OPTIONS.find((o) => o.id === scenario)

  return (
    <aside className="scaffold" aria-label="Design-concept background panel">
      <section className="scaffold__section">
        <h2 className="scaffold__heading">Scenario</h2>
        <div className="scenario-picker" role="radiogroup" aria-label="Choose a scenario">
          {SCENARIO_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={scenario === opt.id}
              className={cx('scenario-picker__option', scenario === opt.id && 'is-selected')}
              onClick={() => onSelectScenario(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {activeOption && <p className="scaffold__hint">{activeOption.hint}</p>}
        <div className="scaffold__actions">
          <button type="button" className="ds-btn" onClick={onRestart}>
            Restart scenario
          </button>
          {canSkipWait && (
            <button type="button" className="ds-btn" onClick={onSkipWait}>
              Skip wait
            </button>
          )}
        </div>
      </section>

      <section className="scaffold__section">
        <h2 className="scaffold__heading">Scenario progress</h2>
        <ol className="stage-track">
          {STAGES.map((s) => (
            <li key={s} className={cx('stage-track__item', s === stage && 'is-current')}>
              {STAGE_LABEL[s]}
            </li>
          ))}
        </ol>
      </section>

      <section className="scaffold__section scaffold__section--log">
        <h2 className="scaffold__heading">Happening in the background</h2>
        <ul className="bg-log" aria-live="polite">
          {log.map((entry) => (
            <li key={entry.id} className="bg-log__row">
              <span className="bg-log__time">{entry.time}</span>
              <span className="bg-log__text">{entry.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
