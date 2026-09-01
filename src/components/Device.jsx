import React from 'react'
import { cx } from '../../_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/_ds_bundle.js'
import {
  STATES,
  currentMedId,
  remainingInBlock,
  isKeyEnabled,
  isStillWaiting,
} from '../stateMachine.js'
import {
  BLOCK_ORDER,
  USER_NAME,
  blockLabel,
  blockTime,
  changesForScenario,
  itemsForBlock,
  medById,
  totalMedCount,
} from '../meds.js'
import { reminderTimeFor, formatStamp } from '../timeUtils.js'
import QuietScreen from './screens/QuietScreen.jsx'
import SetupScanScreen from './screens/SetupScanScreen.jsx'
import SetupReviewScreen from './screens/SetupReviewScreen.jsx'
import SetupLoadScreen from './screens/SetupLoadScreen.jsx'
import SetupLoadedScreen from './screens/SetupLoadedScreen.jsx'
import ChangeScreen from './screens/ChangeScreen.jsx'
import RoutineUpdatedScreen from './screens/RoutineUpdatedScreen.jsx'
import DueScreen from './screens/DueScreen.jsx'
import DoseScreen from './screens/DoseScreen.jsx'
import InfoScreen from './screens/InfoScreen.jsx'
import DidITakeItScreen from './screens/DidITakeItScreen.jsx'
import DeferredScreen from './screens/DeferredScreen.jsx'
import ConfirmedScreen from './screens/ConfirmedScreen.jsx'
import NextScreen from './screens/NextScreen.jsx'
import DayDoneScreen from './screens/DayDoneScreen.jsx'

function screenFor(context) {
  switch (context.state) {
    case STATES.QUIET:
      return <QuietScreen nextTime={blockTime(context.block)} />

    case STATES.SETUP_SCAN:
      return <SetupScanScreen />

    case STATES.SETUP_REVIEW:
      return <SetupReviewScreen pathway={context.setupPathway} />

    case STATES.SETUP_LOAD:
      return <SetupLoadScreen count={totalMedCount(context.scenario)} />

    case STATES.SETUP_LOADED:
      return <SetupLoadedScreen firstDoseTime={blockTime('morning')} />

    case STATES.CHANGE:
      return <ChangeScreen changes={changesForScenario(context.scenario)} />

    case STATES.ROUTINE_UPDATED:
      return <RoutineUpdatedScreen />

    case STATES.DUE:
      return (
        <DueScreen
          userName={USER_NAME}
          block={context.block}
          remaining={remainingInBlock(context)}
          items={context.items.filter((id) => !context.completed.includes(id)).map(medById)}
          stillWaiting={isStillWaiting(context)}
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
          blockLabel={blockLabel(context.block)}
          med={med}
          pips={pips}
        />
      )
    }

    case STATES.INFO: {
      const medId = currentMedId(context)
      return <InfoScreen med={medById(medId)} listening={context.listening} />
    }

    case STATES.DID_I_TAKE_IT:
      return (
        <DidITakeItScreen
          lastConfirmed={context.lastConfirmed}
          nextTime={blockTime(context.block)}
          listening={context.listening}
        />
      )

    case STATES.DEFERRED:
      return <DeferredScreen reminderTime={reminderTimeFor(context.block)} />

    case STATES.CONFIRMED: {
      const nextBlock = BLOCK_ORDER[BLOCK_ORDER.indexOf(context.block) + 1]
      const nextLabel = nextBlock
        ? `Next medication at ${blockTime(nextBlock)}.`
        : 'Nothing else scheduled today.'
      return (
        <ConfirmedScreen
          count={context.completed.length}
          timeLabel={formatStamp(context.confirmedAt)}
          nextLabel={nextLabel}
        />
      )
    }

    case STATES.NEXT: {
      const currentIdx = BLOCK_ORDER.indexOf(context.block)
      const columns = BLOCK_ORDER.map((key, i) => {
        const done = i <= currentIdx
        const count = itemsForBlock(key, context.scenario).length
        return {
          key,
          label: blockLabel(key),
          time: blockTime(key),
          count,
          isActive: key === context.block,
          fillPct: done ? 100 : 0,
          status: done ? 'Done' : count === 0 ? 'Nothing scheduled' : `Due ${blockTime(key)}`,
        }
      })
      return <NextScreen columns={columns} />
    }

    case STATES.DAY_DONE:
      return <DayDoneScreen nextTime={blockTime('morning')} />

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
          aria-label="Help: read this screen aloud, check whether a dose was already taken, or open medication information"
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
