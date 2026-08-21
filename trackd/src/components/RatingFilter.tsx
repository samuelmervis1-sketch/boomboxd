import { RATING_FILTER_OPTIONS, type RatingFilterMode } from '../lib/ratingFilter'
import './RatingFilter.css'

// Albums / Songs / Both toggle, shared by your own profile and public ones.
// Segmented buttons rather than a <select> so the current scope is readable
// at a glance without opening anything.

interface Props {
  value: RatingFilterMode
  onChange: (next: RatingFilterMode) => void
  /** Names the group for screen readers, e.g. "Filter Alice's ratings". */
  label?: string
}

export default function RatingFilter({ value, onChange, label = 'Filter ratings by type' }: Props) {
  return (
    <div className="rating-filter" role="group" aria-label={label}>
      {RATING_FILTER_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`rating-filter-btn${value === opt.value ? ' active' : ''}`}
          // aria-pressed rather than aria-selected: these are toggle buttons,
          // not tabs — there are no associated tabpanels.
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
