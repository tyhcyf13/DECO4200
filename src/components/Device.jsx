import React from 'react'
import { cx } from '../../_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/_ds_bundle.js'
import { STATES, currentMedId, remainingInBlock, isKeyEnabled } from '../stateMachine.js'
import { BLOCKS, BLOCK_ORDER, MEDICATION_CHANGE, USER_NAME, medById } from '../meds.js'
import { reminderTimeFor } from '../timeUtils.js'
import QuietScreen from './screens/QuietScreen.jsx'
import ChangeScreen from './screens/ChangeScreen.jsx'
import DueScreen from './screens/DueScreen.jsx'
import DoseScreen from './screens/DoseScreen.jsx'
import InfoScreen from './screens/InfoScreen.jsx'
import DeferredScreen from './screens/DeferredScreen.jsx'
import ConfirmedScreen from './screens/ConfirmedScreen.jsx'
import NextScreen from './screens/NextScreen.jsx'
import DayDoneScreen from './screens/DayDoneScreen.jsx'

function timeLabel(stamp) {
  if (!stamp) return ''
  const period = stamp.h >= 12 ? 'pm' : 'am'
  const h12 = ((stamp.h + 11) % 12) + 1
  return `${h12}:${String(stamp.m).padStart(2, '0')} ${period}`
}

function screenFor(context) {
  switch (context.state) {
    case STATES.QUIET:
      return <QuietScreen nextTime={BLOCKS[context.block].time} />

    case STATES.CHANGE:
      return <ChangeScreen change={MEDICATION_CHANGE} />

    case STATES.DUE:
      return (
        <DueScreen
          userName={USER_NAME}
          block={context.block}
          remaining={remainingInBlock(context)}
          items={context.items.filter((id) => !context.completed.includes(id)).map(medById)}
        />
      )

    case STATES.DOSE: {
      const medId = currentMedId(context)
      const med = medById(medId)
      const pips = context.items.map((id, i) =>
        context.completed.includes(id) ? 'done' : i === context.doseIndex ? 'current' : 'pending'
      )
      return (
        <DoseScreen
          index={context.doseIndex + 1}
          total={context.items.length}
          blockLabel={BLOCKS[context.block].label}
          med={med}
          pips={pips}
        />
      )
    }

    case STATES.INFO: {
      const medId = currentMedId(context)
      return <InfoScreen med={medById(medId)} listening={context.listening} />
    }

    case STATES.DEFERRED:
      return <DeferredScreen reminderTime={reminderTimeFor(context.block)} />

    case STATES.CONFIRMED: {
      const nextBlock = BLOCK_ORDER[BLOCK_ORDER.indexOf(context.block) + 1]
      const nextLabel = nextBlock
        ? `Next medication at ${BLOCKS[nextBlock].time}.`
        : 'Nothing else scheduled today.'
      return (
        <ConfirmedScreen
          count={context.completed.length}
          timeLabel={timeLabel(context.confirmedAt)}
          nextLabel={nextLabel}
        />
      )
    }

    case STATES.NEXT: {
      const currentIdx = BLOCK_ORDER.indexOf(context.block)
      const columns = BLOCK_ORDER.map((key, i) => {
        const done = i <= currentIdx
        return {
          key,
          label: BLOCKS[key].label,
          time: BLOCKS[key].time,
          isActive: key === context.block,
          fillPct: done ? 100 : 0,
          status: done ? 'Done' : `Due ${BLOCKS[key].time}`,
        }
      })
      return <NextScreen columns={columns} />
    }

    case STATES.DAY_DONE:
      return <DayDoneScreen nextTime={BLOCKS.morning.time} />

    default:
      return null
  }
}

export default function Device({ context, dispatch }) {
  const doneEnabled = isKeyEnabled(context, 'done')
  const laterEnabled = isKeyEnabled(context, 'later')
  const helpEnabled = isKeyEnabled(context, 'help')
  const isDim = context.state === STATES.QUIET || context.state === STATES.DEFERRED

  return (
    <div className="device">
      <div className={cx('device__bezel', isDim && 'device__bezel--dim')}>
        <div className="device__screen" role="group" aria-live="polite">
          {screenFor(context)}
        </div>
      </div>
      <div className="device__keys">
        <button
          type="button"
          className="key key--help"
          disabled={!helpEnabled}
          onClick={() => dispatch({ type: 'HELP' })}
          aria-label="Help: read this screen aloud, or open medication information"
        >
          ?
        </button>
        <button
          type="button"
          className="key key--later"
          disabled={!laterEnabled}
          onClick={() => dispatch({ type: 'LATER' })}
        >
          LATER
        </button>
        <button
          type="button"
          className={cx('key', 'key--done', doneEnabled && 'key--illuminated')}
          disabled={!doneEnabled}
          onClick={() => dispatch({ type: 'DONE' })}
        >
          DONE
        </button>
      </div>
      <div className="device__stand" aria-hidden="true" />
    </div>
  )
}
