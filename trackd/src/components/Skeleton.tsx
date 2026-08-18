import './Skeleton.css'

// Placeholders for content that's still loading *after* the page shell is
// already on screen. Each preset mirrors the real component's dimensions so
// swapping in the loaded content causes no layout shift.

interface BoxProps {
  width?: string
  height?: string
  radius?: string
  className?: string
}

export function SkeletonBox({ width, height, radius, className }: BoxProps) {
  return (
    <span
      className={`skeleton skeleton-box ${className ?? ''}`}
      style={{ width, height, borderRadius: radius }}
    />
  )
}

export function SkeletonCircle({ size = '40px', className }: { size?: string; className?: string }) {
  return (
    <span
      className={`skeleton skeleton-circle ${className ?? ''}`}
      style={{ width: size, height: size }}
    />
  )
}

/** `width` sets the last line's width so ragged text doesn't look like a block. */
export function SkeletonText({
  lines = 1,
  width = '100%',
  className,
}: {
  lines?: number
  width?: string
  className?: string
}) {
  return (
    <span className={`skeleton-text ${className ?? ''}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="skeleton skeleton-line"
          style={{ width: i === lines - 1 ? width : '100%' }}
        />
      ))}
    </span>
  )
}

// ── Presets ────────────────────────────────────────────────
// Sized to match their real counterparts exactly.

/** Matches `.track-card` in Home search results. */
export function SkeletonTrackRow() {
  return (
    <div className="skeleton-track-row" aria-hidden="true">
      <SkeletonBox width="48px" height="48px" radius="6px" />
      <div className="skeleton-track-row-body">
        <SkeletonBox height="13px" width="58%" radius="4px" />
        <SkeletonBox height="11px" width="34%" radius="4px" />
      </div>
      <SkeletonBox width="64px" height="32px" radius="999px" />
    </div>
  )
}

/** Matches `.album-card` in the Home albums grid. */
export function SkeletonAlbumCard() {
  return (
    <div className="skeleton-album-card" aria-hidden="true">
      {/* Square art: sized by aspect-ratio in CSS, not an inline height */}
      <SkeletonBox className="skeleton-album-art" radius="10px" />
      <div className="skeleton-album-card-body">
        <SkeletonBox height="13px" width="80%" radius="4px" />
        <SkeletonBox height="11px" width="55%" radius="4px" />
      </div>
    </div>
  )
}

/** Matches `.discover-card` in Discover's horizontal rows. */
export function SkeletonDiscoverCard() {
  return (
    <div className="skeleton-discover-card" aria-hidden="true">
      <SkeletonBox className="skeleton-discover-art" radius="10px" />
      <SkeletonBox height="12px" width="85%" radius="4px" />
      <SkeletonBox height="10px" width="60%" radius="4px" />
    </div>
  )
}

/** Matches `.feed-item`. */
export function SkeletonFeedItem() {
  return (
    <div className="skeleton-feed-item" aria-hidden="true">
      <SkeletonBox width="72px" height="72px" radius="8px" />
      <div className="skeleton-feed-item-body">
        <SkeletonBox height="12px" width="30%" radius="4px" />
        <SkeletonBox height="15px" width="60%" radius="4px" />
        <SkeletonBox height="12px" width="40%" radius="4px" />
        <SkeletonBox height="12px" width="72%" radius="4px" />
      </div>
    </div>
  )
}

/** Matches a `.community-review` row on album/track pages. */
export function SkeletonReview() {
  return (
    <div className="skeleton-review" aria-hidden="true">
      <SkeletonCircle size="34px" />
      <div className="skeleton-review-body">
        <SkeletonBox height="12px" width="26%" radius="4px" />
        <SkeletonText lines={2} width="64%" />
      </div>
    </div>
  )
}

/** Matches the 3/4-up stat row on profile pages. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-stats" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat">
          <SkeletonBox height="24px" width="42px" radius="4px" />
          <SkeletonBox height="10px" width="56px" radius="4px" />
        </div>
      ))}
    </div>
  )
}

/** Matches `.track-row` in the album tracklist. */
export function SkeletonTracklist({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-tracklist" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-tracklist-row">
          <SkeletonBox width="14px" height="12px" radius="3px" />
          <SkeletonBox
            height="13px"
            width={`${52 + ((i * 13) % 30)}%`}
            radius="4px"
          />
          <SkeletonBox width="34px" height="11px" radius="3px" />
        </div>
      ))}
    </div>
  )
}

/** Repeats any preset — keeps `.map` boilerplate out of the pages. */
export function SkeletonList({
  count,
  children,
}: {
  count: number
  children: (i: number) => React.ReactNode
}) {
  return <>{Array.from({ length: count }).map((_, i) => children(i))}</>
}
