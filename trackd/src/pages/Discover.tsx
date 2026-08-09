import EmptyState, { CompassIcon } from '../components/EmptyState'

export default function Discover() {
  return (
    <div className="page">
      <h1 className="page-title">Discover</h1>
      <p className="page-subtitle">
        Find new music through what other listeners are rating.
      </p>

      <EmptyState
        icon={<CompassIcon />}
        title="Discover is coming soon"
        text="Trending albums and staff picks will live here. In the meantime, search for anything you already love and rate it — that's how your recommendations get better."
        to="/"
        actionLabel="Search for music"
      />
    </div>
  )
}
