import React, { useEffect, useRef, useState } from 'react'
import {
  STATES,
  SCENARIOS,
  initialContext,
  transition,
  selectScenario,
  restart,
  isKeyEnabled,
  stageForState,
} from './stateMachine.js'
import { describeTransition, initialLogLines } from './background.js'
import { BLOCKS, medById } from './meds.js'
import { confirmedTimeFor } from './timeUtils.js'
import { formatClock } from '../_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/_ds_bundle.js'
import Device from './components/Device.jsx'
import BackgroundPanel from './components/BackgroundPanel.jsx'

function itemsForBlock(block) {
  return BLOCKS[block].items.map((m) => m.id)
}

let logId = 0
function toLogEntry(text) {
  logId += 1
  return { id: logId, time: formatClock(new Date()), text }
}

export default function App() {
  const [context, setContext] = useState(() => initialContext(SCENARIOS.NORMAL))
  const [log, setLog] = useState(() => initialLogLines(SCENARIOS.NORMAL).map(toLogEntry))
  const contextRef = useRef(context)
  contextRef.current = context

  // Reads contextRef (not the `context` closure) so this stays correct no
  // matter which render's `dispatch` closure ends up invoked — the keydown
  // listener below is attached once and would otherwise call a stale copy.
  // setContext/setLog are called with a plain next value here rather than an
  // updater function that performs a side effect: StrictMode intentionally
  // double-invokes updater functions in dev, which would double-log.
  function dispatch(event) {
    const prev = contextRef.current
    const deps = { itemsForBlock, now: () => confirmedTimeFor(prev.block) }
    const next = transition(prev, event, deps)
    if (next === prev) return
    const lines = describeTransition(prev, event, next, { medLookup: medById })
    setContext(next)
    if (lines.length) setLog((l) => [...l, ...lines.map(toLogEntry)])
  }

  function handleSelectScenario(scenario) {
    setContext(selectScenario(context, scenario))
    setLog(initialLogLines(scenario).map(toLogEntry))
  }

  function handleRestart() {
    setContext(restart(context))
    setLog(initialLogLines(context.scenario).map(toLogEntry))
  }

  // The passage of time is a system event, never a key press: a block
  // becoming due, or a deferred reminder firing, both happen on their own.
  useEffect(() => {
    if (context.state === STATES.QUIET || context.state === STATES.DEFERRED) {
      const delay = context.state === STATES.QUIET ? 3500 : 4000
      const id = setTimeout(() => dispatch({ type: 'SYSTEM_TICK' }), delay)
      return () => clearTimeout(id)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.state, context.block, context.deferredFrom])

  // Keyboard mirrors the three hardware keys: Enter/D = DONE, L = LATER, ? = help.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        return
      }
      const current = contextRef.current
      if (e.key === 'Enter' || e.key.toLowerCase() === 'd') {
        if (isKeyEnabled(current, 'done')) {
          e.preventDefault()
          dispatch({ type: 'DONE' })
        }
      } else if (e.key.toLowerCase() === 'l') {
        if (isKeyEnabled(current, 'later')) {
          e.preventDefault()
          dispatch({ type: 'LATER' })
        }
      } else if (e.key === '?') {
        if (isKeyEnabled(current, 'help')) {
          e.preventDefault()
          dispatch({ type: 'HELP' })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const canSkipWait = context.state === STATES.QUIET || context.state === STATES.DEFERRED

  return (
    <div className="page">
      <header className="page__header">
        <p className="page__eyebrow">DECO4200 — design concept prototype</p>
        <h1 className="page__title">Medication companion</h1>
        <p className="page__lede">
          One simplified daily routine, delivered through a single quiet device. Everything
          around it — prescriptions, timing, refills — is background work you never have to see.
        </p>
      </header>

      <div className="stage">
        <Device context={context} dispatch={dispatch} />
        <BackgroundPanel
          scenario={context.scenario}
          onSelectScenario={handleSelectScenario}
          stage={stageForState(context.state)}
          log={log}
          onRestart={handleRestart}
          canSkipWait={canSkipWait}
          onSkipWait={() => dispatch({ type: 'SYSTEM_TICK' })}
        />
      </div>
    </div>
  )
}
