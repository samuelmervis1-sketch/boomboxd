import { COVER_STACK_SIZE } from '../lib/listsApi'
import AlbumArt from './AlbumArt'
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
        <AlbumArt
          key={`${src}-${i}`}
          src={src}
          alt=""
          className="cover-stack-item"
          // Both the base sizing/margin behaviour AND the "no image" look
          // come from cover-stack-item — the fallback icon centering rides
          // on top of it as a second class, same pattern as the rest of
          // the app's placeholders.
          placeholderClassName="cover-stack-item cover-stack-item-fallback"
          loading="lazy"
          // First sleeve in front, the rest receding behind it
          style={{ zIndex: COVER_STACK_SIZE - i }}
        />
      ))}
    </div>
  )
}
