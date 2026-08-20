import { useEffect, useState } from 'react'

// The same glyph was already hand-copied into Discover.tsx and Home.tsx
// for their "no image URL" placeholders — hoisted here since every album
// art placeholder in the app (not just the two that already had one) now
// needs it.
// `size` only matters where there's no CSS rule sizing the svg (e.g. the
// inline-styled ShareCardModal, captured pixel-for-pixel by html-to-image).
// Everywhere else, a `.foo-placeholder svg { width; height }` rule in the
// page's stylesheet overrides this default via the cascade.
export function MusicIcon({ size = 24 }: { size?: number } = {}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

interface AlbumArtProps {
  src: string | null | undefined
  alt: string
  /** Class applied to the <img> when it renders. */
  className?: string
  /** Class applied to the placeholder <div> — shown with no src, and also
   *  after a load failure, so a dead URL never falls through to the
   *  browser's broken-image glyph. */
  placeholderClassName: string
  loading?: 'lazy' | 'eager'
  style?: React.CSSProperties
}

export default function AlbumArt({ src, alt, className, placeholderClassName, loading, style }: AlbumArtProps) {
  const [failed, setFailed] = useState(false)

  // A fresh src deserves a fresh attempt — without this, a component
  // instance reused across a src change (rather than remounted) would
  // stay stuck on the placeholder from the previous image's failure.
  useEffect(() => setFailed(false), [src])

  if (!src || failed) {
    return (
      <div className={placeholderClassName} style={style}>
        <MusicIcon />
      </div>
    )
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      style={style}
      onError={() => setFailed(true)}
    />
  )
}
