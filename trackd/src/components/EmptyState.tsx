import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Shared empty state so Feed / Lists / Discover all explain themselves the
// same way: an icon, what this page is, and one obvious thing to do next.
// Styles live in App.css under `.empty-state`.

interface Props {
  icon: ReactNode
  title: string
  text: string
  /** Router link CTA. Provide either this or onAction, not both. */
  to?: string
  /** Button CTA, for actions that open a modal rather than navigate. */
  onAction?: () => void
  actionLabel?: string
}

export default function EmptyState({ icon, title, text, to, onAction, actionLabel }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-art" aria-hidden="true">{icon}</div>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-text">{text}</p>
      {to && actionLabel && (
        <Link to={to} className="empty-state-cta">{actionLabel}</Link>
      )}
      {onAction && actionLabel && (
        <button type="button" className="empty-state-cta" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ── Empty-state illustrations ──────────────────────────────
// Each page gets its own small scene drawn from the app's own world
// (a stereo, a spindle, a tuning dial) rather than a shared generic
// glyph, so an empty page still tells you which page you're on.
// Muted linework with a single lit element in the accent.

const line = 'rgba(255,255,255,0.22)'
const lineSoft = 'rgba(255,255,255,0.12)'
const accent = '#e8ff6b'

/** Feed — two speakers wired together: nothing playing through them yet. */
export function HeadphonesIcon() {
  return (
    <svg viewBox="0 0 96 72" fill="none" className="empty-art">
      {/* Cable arcing between the two cabinets */}
      <path d="M26 44c6 12 38 12 44 0" stroke={lineSoft} strokeWidth="2" strokeLinecap="round" />
      {/* Left cabinet */}
      <rect x="8" y="14" width="34" height="44" rx="4" stroke={line} strokeWidth="2" />
      <circle cx="25" cy="34" r="10" stroke={line} strokeWidth="2" />
      <circle cx="25" cy="34" r="3.2" fill={line} />
      <circle cx="25" cy="50" r="3.6" stroke={lineSoft} strokeWidth="1.6" />
      {/* Right cabinet — the one that's powered on */}
      <rect x="54" y="14" width="34" height="44" rx="4" stroke={line} strokeWidth="2" />
      <circle cx="71" cy="34" r="10" stroke={accent} strokeWidth="2" opacity="0.85" />
      <circle cx="71" cy="34" r="3.2" fill={accent} />
      <circle cx="71" cy="50" r="3.6" stroke={accent} strokeWidth="1.6" opacity="0.6" />
    </svg>
  )
}

/** Lists — a record spindle with one disc on it, waiting for a stack. */
export function ListPlusIcon() {
  return (
    <svg viewBox="0 0 96 72" fill="none" className="empty-art">
      {/* Spindle post */}
      <path d="M48 10v34" stroke={line} strokeWidth="2" strokeLinecap="round" />
      {/* Empty slots above, drawn as dashes: room for more */}
      <path d="M30 22h14M52 22h14" stroke={lineSoft} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
      <path d="M28 32h16M52 32h16" stroke={lineSoft} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
      {/* The one record that's on the spindle */}
      <ellipse cx="48" cy="50" rx="34" ry="11" stroke={accent} strokeWidth="2" opacity="0.85" />
      <ellipse cx="48" cy="50" rx="17" ry="5.5" stroke={accent} strokeWidth="1.4" opacity="0.45" />
      <ellipse cx="48" cy="50" rx="3.4" ry="1.4" fill={accent} />
      {/* Base */}
      <path d="M20 60h56" stroke={line} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Discover — a tuner dial mid-scan, needle resting on a lit station. */
export function CompassIcon() {
  return (
    <svg viewBox="0 0 96 72" fill="none" className="empty-art">
      {/* Dial face */}
      <rect x="10" y="18" width="76" height="36" rx="6" stroke={line} strokeWidth="2" />
      {/* Frequency ticks — irregular, like a real tuning scale */}
      <path
        d="M20 28v8M27 28v12M34 28v8M41 28v12M48 28v8M55 28v12M62 28v8M69 28v12M76 28v8"
        stroke={lineSoft}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* The needle, parked on one station */}
      <path d="M58 22v28" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="58" cy="50" r="3.4" fill={accent} />
      {/* Signal arcs coming off the tuned station */}
      <path d="M66 30a10 10 0 0 1 0 12" stroke={accent} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <path d="M72 26a18 18 0 0 1 0 20" stroke={accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.28" />
    </svg>
  )
}
