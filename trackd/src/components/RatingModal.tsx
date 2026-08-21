import { useState } from 'react'
import confetti from 'canvas-confetti'
import type { SpotifyAlbum, SpotifyTrack } from '../services/spotifyApi'
import { ratingsApi, type Rating } from '../lib/ratingsApi'
import { describeError } from '../lib/errorMessage'
import './RatingModal.css'

// ── Five-star celebration ──────────────────────────────────

function celebrateFiveStars() {
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 35,
    ticks: 110,
    origin: { y: 0.4 },
    colors: ['#f2a83c', '#9b7bf5', '#f4ede0'],
  })
}

// ── Star glyph (read-only visual) ──────────────────────────

export function StarGlyph({ value, pos }: { value: number; pos: number }) {
  const fill = value >= pos ? 'full' : value >= pos - 0.5 ? 'half' : 'empty'
  return <span className={`star-glyph star-${fill}`}>★</span>
}

// ── Interactive half-star picker ───────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const displayed = hovered ?? value

  return (
    <div className="star-picker" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className="star-cell">
          <button
            type="button"
            className="star-hit star-hit-left"
            onMouseEnter={() => setHovered(n - 0.5)}
            onClick={() => onChange(n - 0.5)}
            aria-label={`Rate ${n - 0.5} stars`}
          />
          <button
            type="button"
            className="star-hit star-hit-right"
            onMouseEnter={() => setHovered(n)}
            onClick={() => onChange(n)}
            aria-label={`Rate ${n} stars`}
          />
          <StarGlyph value={displayed} pos={n} />
        </div>
      ))}
    </div>
  )
}

function ratingLabel(r: number) {
  return r === 1 ? '1 star' : `${r} stars`
}

// ── Modal ──────────────────────────────────────────────────

interface Props {
  album: SpotifyAlbum
  track?: SpotifyTrack
  existing: Rating | null
  onClose: () => void
  onSaved: (rating: Rating | null) => void
}

export default function RatingModal({ album, track, existing, onClose, onSaved }: Props) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [review, setReview] = useState(existing?.review ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!rating) { setError('Please select a rating.'); return }
    setSaving(true)
    setError(null)

    let saved: Rating
    try {
      saved = track
        ? await ratingsApi.upsertTrack({
            albumId: album.id,
            albumName: album.name,
            albumArtist: album.artists.map(a => a.name).join(', '),
            albumImage: album.images[0]?.url ?? null,
            trackId: track.id,
            trackName: track.name,
            rating,
            review: review.trim() || null,
          })
        : await ratingsApi.upsert({
            albumId: album.id,
            albumName: album.name,
            albumArtist: album.artists.map(a => a.name).join(', '),
            albumImage: album.images[0]?.url ?? null,
            rating,
            review: review.trim() || null,
          })
    } catch (e: unknown) {
      setError(describeError(e, "Couldn't save your rating. Please try again."))
      setSaving(false)
      return
    }

    // Deliberately outside the try: the write has already committed by this
    // point, so a failure in the confetti or in the parent's refresh must not
    // be reported to the user as "couldn't save your rating".
    if (!existing && rating === 5) celebrateFiveStars()
    onSaved(saved)
  }

  async function handleDelete() {
    if (!existing) return
    setSaving(true)
    setError(null)
    try {
      if (track) await ratingsApi.removeTrack(album.id, track.id)
      else await ratingsApi.remove(album.id)
    } catch (e: unknown) {
      setError(describeError(e, "Couldn't delete your rating. Please try again."))
      setSaving(false)
      return
    }
    onSaved(null)
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={track ? 'Rate track' : 'Rate album'}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-album-info">
            {track ? (
              <>
                <p className="modal-album-name">{track.name}</p>
                <p className="modal-album-artist">{album.name} · {album.artists.map(a => a.name).join(', ')}</p>
              </>
            ) : (
              <>
                <p className="modal-album-name">{album.name}</p>
                <p className="modal-album-artist">{album.artists.map(a => a.name).join(', ')}</p>
              </>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="star-section">
            <StarPicker value={rating} onChange={setRating} />
            <p className="rating-label">
              {rating ? ratingLabel(rating) : 'Select a rating'}
            </p>
          </div>

          <div className="review-section">
            <label className="review-label">
              Review <span>(optional)</span>
            </label>
            <textarea
              className="review-textarea"
              placeholder="What did you think?"
              value={review}
              onChange={e => setReview(e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>

          {error && <p className="modal-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {existing && (
            <button className="btn-delete" onClick={handleDelete} disabled={saving}>
              Delete
            </button>
          )}
          <div className="modal-footer-right">
            <button className="btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn-save" onClick={handleSave} disabled={saving || !rating}>
              {saving ? 'Saving…' : existing ? 'Update' : 'Save Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
