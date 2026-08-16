import { COVER_STACK_SIZE } from '../lib/listsApi'
import './CoverStack.css'

// A list's first few sleeves, overlapping like records leaning in a crate.
// Decorative: the list title next to it already names the thing, so the
// whole stack is hidden from assistive tech.

export default function CoverStack({ images }: { images: string[] }) {
  const covers = images.slice(0, COVER_STACK_SIZE)

  if (covers.length === 0) {
    return (
      <div className="cover-stack cover-stack-empty" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    )
  }

  return (
    <div className="cover-stack" aria-hidden="true">
      {covers.map((src, i) => (
        <img
          key={`${src}-${i}`}
          className="cover-stack-item"
          src={src}
          alt=""
          loading="lazy"
          // First sleeve in front, the rest receding behind it
          style={{ zIndex: COVER_STACK_SIZE - i }}
        />
      ))}
    </div>
  )
}
