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
      <div className="empty-state-icon">{icon}</div>
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

// ── Icons used by the empty states ─────────────────────────

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function HeadphonesIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

export function ListPlusIcon() {
  return (
    <svg {...iconProps}>
      <line x1="3" y1="6" x2="14" y2="6" />
      <line x1="3" y1="12" x2="14" y2="12" />
      <line x1="3" y1="18" x2="11" y2="18" />
      <line x1="18" y1="10" x2="18" y2="18" />
      <line x1="14" y1="14" x2="22" y2="14" />
    </svg>
  )
}

export function CompassIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}
