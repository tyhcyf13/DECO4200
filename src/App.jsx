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
import { itemsForBlock, medById } from './meds.js'
import { confirmedTimeFor } from './timeUtils.js'
import { cx, formatClock } from '../_ds/nocturne-b8258e1f-79a7-4445-a0b9-05991948f0a0/_ds_bundle.js'
import Device from './components/Device.jsx'
import BackgroundPanel from './components/BackgroundPanel.jsx'

let logId = 0
function toLogEntry({ text, domain }) {
  logId += 1
  return { id: logId, time: formatClock(new Date()), text, domain }
}

export default function App() {
  const [context, setContext] = useState(() => initialContext(SCENARIOS.NORMAL))
  const [log, setLog] = useState(() => initialLogLines(SCENARIOS.NORMAL).map(toLogEntry))
  const [supportConnected, setSupportConnected] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const contextRef = useRef(context)
  contextRef.current = context
  const deviceWrapperRef = useRef(null)

  // Focus mode is for showing this to a real participant on a tablet: it
  // hides the header and the whole background panel (that panel is
  // explanatory scaffolding for presenting the concept, not part of the
  // imagined product — a test participant seeing it, or being able to jump
  // scenarios themselves, would spoil what's actually being tested), and
  // lets the device grow to fill the space. It also requests real
  // OS-level fullscreen where the browser supports it, to hide Safari's own
  // chrome — but works as a plain CSS state even where that API doesn't
  // exist, so it isn't load-bearing.
  function enterFocusMode() {
    setFocusMode(true)
    const el = deviceWrapperRef.current
    const request =
      el?.requestFullscreen || el?.webkitRequestFullscreen || el?.webkitEnterFullscreen
    request?.call(el)?.catch?.(() => {})
  }

  function exitFocusMode() {
    setFocusMode(false)
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen
      exit?.call(document)?.catch?.(() => {})
    }
  }

  // If the participant (or facilitator) exits native fullscreen directly —
  // Escape, a swipe-down gesture, the OS chrome — keep focusMode in sync
  // rather than leaving a stale "focused" view with no way back in.
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setFocusMode(false)
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
    }
  }, [])

  // handleToggleSupport is recreated fresh each render and only ever called
  // from a fresh onClick prop (never a stale listener), so reading the
  // `supportConnected` closure directly is safe here — unlike `dispatch`,
  // which reads contextRef because it's also invoked from a keydown
  // listener attached once on mount.
  function handleToggleSupport() {
    const next = !supportConnected
    setSupportConnected(next)
    setLog((l) => [
      ...l,
      toLogEntry({
        text: next ? 'Support person connected by user.' : 'Support person disconnected by user.',
        domain: 'digital',
      }),
    ])
  }

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
      } else if (e.key === 'Escape') {
        // Covers the case native fullscreen was never actually entered
        // (unsupported browser) — the fullscreenchange listener handles it
        // when native fullscreen did engage and gets exited this way.
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const canSkipWait = context.state === STATES.QUIET || context.state === STATES.DEFERRED

  return (
    <div className={cx('page', focusMode && 'page--focus')}>
      {!focusMode && (
        <header className="page__header">
          <div className="page__header-row">
            <div>
              <p className="page__eyebrow">DECO4200 — design concept prototype</p>
              <h1 className="page__title">Medication companion</h1>
            </div>
            <button type="button" className="ds-btn page__focus-toggle" onClick={enterFocusMode}>
              Fullscreen for testing
            </button>
          </div>
          <p className="page__lede">
            One simplified daily routine, delivered through a single quiet device. Everything
            around it — prescriptions, timing, refills — is background work you never have to see.
          </p>
          <p className="page__principle">
            Digital for complexity. Physical for interaction.
          </p>
        </header>
      )}

      <div className="stage">
        <div ref={deviceWrapperRef} className="device-wrapper">
          <Device context={context} dispatch={dispatch} />
          {focusMode && (
            <button
              type="button"
              className="ds-btn page__focus-exit"
              onClick={exitFocusMode}
              aria-label="Exit fullscreen"
            >
              Exit
            </button>
          )}
        </div>
        {!focusMode && (
          <BackgroundPanel
            scenario={context.scenario}
            onSelectScenario={handleSelectScenario}
            stage={stageForState(context.state)}
            log={log}
            onRestart={handleRestart}
            canSkipWait={canSkipWait}
            onSkipWait={() => dispatch({ type: 'SYSTEM_TICK' })}
            supportConnected={supportConnected}
            onToggleSupport={handleToggleSupport}
          />
        )}
      </div>
    </div>
  )
}
