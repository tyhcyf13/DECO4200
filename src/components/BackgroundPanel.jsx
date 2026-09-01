import React from 'react'
import { SCENARIOS, STAGES } from '../stateMachine.js'
import { cx } from '../../_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/_ds_bundle.js'

const SCENARIO_OPTIONS = [
  {
    id: SCENARIOS.NORMAL,
    label: 'Normal morning',
    hint: 'Press DONE through the day — morning, afternoon, and evening. Try LATER and ? too.',
  },
  {
    id: SCENARIOS.SETUP_DIGITAL,
    label: 'Digital prescription setup',
    hint: 'Press DONE to receive the prescription, load the medications, and ready the routine.',
  },
  {
    id: SCENARIOS.SETUP_PHYSICAL,
    label: 'Physical prescription setup',
    hint: 'Press DONE to scan the prescription, load the medications, and ready the routine.',
  },
  {
    id: SCENARIOS.CHANGE,
    label: 'Medication change',
    hint: 'A change interruption appears first — press DONE ("I understand") to update the routine.',
  },
]

const STAGE_LABEL = {
  setup: 'Setup',
  waiting: 'Waiting',
  prompted: 'Prompted',
  taking: 'Taking',
  confirmed: 'Confirmed',
  planned: 'Planned',
}

const SAFETY_NOTES = [
  'Prescription information comes from an authorised, verified source — the device never generates it.',
  'The system never independently prescribes or changes a medication instruction.',
  'Medication changes are always shown to the user before they take effect.',
  'The user stays in control of deferring, confirming, and reviewing their own routine.',
  "Personal medication information isn't shared beyond what the user allows.",
  'Family or carer involvement is optional and consent-based — support, not surveillance.',
]

export default function BackgroundPanel({
  scenario,
  onSelectScenario,
  stage,
  log,
  onRestart,
  canSkipWait,
  onSkipWait,
  supportConnected,
  onToggleSupport,
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

      <div className="scaffold__row">
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

        <section className="scaffold__section">
          <h2 className="scaffold__heading">Happening in the background</h2>
          <p className="scaffold__hint">
            <span className="bg-log__legend-dot bg-log__legend-dot--physical" /> physical &nbsp;
            <span className="bg-log__legend-dot bg-log__legend-dot--digital" /> digital
          </p>
          <ul className="bg-log" aria-live="polite">
            {log.map((entry) => (
              <li key={entry.id} className={cx('bg-log__row', `bg-log__row--${entry.domain}`)}>
                <span className="bg-log__time">{entry.time}</span>
                <span className="bg-log__text">{entry.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="scaffold__row">
        <section className="scaffold__section">
          <h2 className="scaffold__heading">Support person</h2>
          <p className="scaffold__body">{supportConnected ? 'Connected' : 'Not connected'}</p>
          <p className="scaffold__hint">
            Optional — only notifies if a dose remains unresolved after an agreed period. The
            user stays in control of whether this is on.
          </p>
          <div className="scaffold__actions">
            <button type="button" className="ds-btn" onClick={onToggleSupport}>
              {supportConnected ? 'Disconnect' : 'Connect support person'}
            </button>
          </div>
        </section>

        <section className="scaffold__section">
          <h2 className="scaffold__heading">Design principles</h2>
          <ul className="safety-notes">
            {SAFETY_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="scaffold__hint">
            Design considerations for a university prototype — not a claim of medical
            certification.
          </p>
        </section>
      </div>
    </aside>
  )
}
