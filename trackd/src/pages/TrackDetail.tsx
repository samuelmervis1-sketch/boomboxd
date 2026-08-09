import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import { spotifyApi, type SpotifyTrack } from '../services/spotifyApi'
import { supabase } from '../lib/supabase'
import { ratingsApi, type Rating } from '../lib/ratingsApi'
import { profilesApi, type Profile } from '../lib/profilesApi'
import { momentsApi, type Moment } from '../lib/momentsApi'
import { followsApi } from '../lib/followsApi'
import { formatDuration } from '../lib/format'
import { reviewerColor, reviewerName, reviewerInitial } from '../lib/reviewerDisplay'
import RatingModal, { StarGlyph } from '../components/RatingModal'
import FollowButton from '../components/FollowButton'
import AddToListButton from '../components/AddToListButton'
import './TrackDetail.css'

// ── Helpers ────────────────────────────────────────────────

function parseTimestamp(input: string): number | null {
  const match = input.trim().match(/^(\d{1,3}):([0-5]\d)$/)
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

function formatTimestamp(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Icons ──────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

// ── Inline star display (read-only) ───────────────────────

function InlineStars({ rating }: { rating: number }) {
  return (
    <span className="inline-stars">
      {[1, 2, 3, 4, 5].map(n => <StarGlyph key={n} value={rating} pos={n} />)}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────

export default function TrackDetail() {
  const { id } = useParams<{ id: string }>()

  const [track, setTrack]     = useState<SpotifyTrack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [user, setUser]         = useState<User | null>(null)
  const [myRating, setMyRating] = useState<Rating | null>(null)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [signInPrompt, setSignInPrompt] = useState(false)

  const [communityRatings, setCommunityRatings] = useState<Rating[]>([])
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, Profile>>({})
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  const [moments, setMoments] = useState<Moment[]>([])
  const [momentProfiles, setMomentProfiles] = useState<Record<string, Profile>>({})
  const [momentFormOpen, setMomentFormOpen] = useState(false)
  const [momentTimestamp, setMomentTimestamp] = useState('')
  const [momentComment, setMomentComment] = useState('')
  const [momentSaving, setMomentSaving] = useState(false)
  const [momentError, setMomentError] = useState<string | null>(null)

  // Load track
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    spotifyApi.getTrack(id)
      .then(setTrack)
      .catch(() => setError('Could not load song. Check your connection.'))
      .finally(() => setLoading(false))
  }, [id])

  // Track auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load existing rating whenever user or track changes
  useEffect(() => {
    if (!user || !id) { setMyRating(null); return }
    ratingsApi.getMyRatingForTrack(id)
      .then(setMyRating)
      .catch(() => setMyRating(null))
  }, [user?.id, id])

  // Load community ratings for this track
  useEffect(() => {
    if (!id) return
    ratingsApi.getRatingsForTrack(id)
      .then(setCommunityRatings)
      .catch(() => setCommunityRatings([]))
  }, [id])

  // Load profiles for anyone who left a written review, to show real names
  useEffect(() => {
    const reviewerIds = [...new Set(
      communityRatings.filter(r => r.review && r.review.trim().length > 0).map(r => r.user_id)
    )]
    if (reviewerIds.length === 0) { setReviewerProfiles({}); return }
    profilesApi.getProfiles(reviewerIds)
      .then(profiles => setReviewerProfiles(Object.fromEntries(profiles.map(p => [p.id, p]))))
      .catch(() => setReviewerProfiles({}))
  }, [communityRatings])

  // Load moments (timestamped comments) for this track
  useEffect(() => {
    if (!id) return
    momentsApi.getMomentsForTrack(id)
      .then(setMoments)
      .catch(() => setMoments([]))
  }, [id])

  // Load profiles for anyone who's left a moment, to show @username
  useEffect(() => {
    const ids = [...new Set(moments.map(m => m.user_id))]
    if (ids.length === 0) { setMomentProfiles({}); return }
    profilesApi.getProfiles(ids)
      .then(profiles => setMomentProfiles(Object.fromEntries(profiles.map(p => [p.id, p]))))
      .catch(() => setMomentProfiles({}))
  }, [moments])

  // Load who the signed-in user follows, to render Follow/Following state
  useEffect(() => {
    if (!user) { setFollowingIds(new Set()); return }
    followsApi.getFollowing(user.id)
      .then(rows => setFollowingIds(new Set(rows.map(r => r.following_id))))
      .catch(() => setFollowingIds(new Set()))
  }, [user?.id])

  function handleFollowChange(targetUserId: string, following: boolean) {
    setFollowingIds(prev => {
      const next = new Set(prev)
      if (following) next.add(targetUserId)
      else next.delete(targetUserId)
      return next
    })
  }

  function openRating() {
    if (!user) { setSignInPrompt(true); return }
    setSignInPrompt(false)
    setRatingOpen(true)
  }

  function handleRatingSaved(rating: Rating | null) {
    setMyRating(rating)
    if (id) ratingsApi.getRatingsForTrack(id).then(setCommunityRatings).catch(() => {})
    setRatingOpen(false)
  }

  function openMomentForm() {
    if (!user) { setSignInPrompt(true); return }
    setSignInPrompt(false)
    setMomentFormOpen(true)
    setMomentTimestamp('')
    setMomentComment('')
    setMomentError(null)
  }

  function closeMomentForm() {
    setMomentFormOpen(false)
    setMomentError(null)
  }

  async function handleAddMoment(e: React.FormEvent) {
    e.preventDefault()
    if (!track?.album) return
    const seconds = parseTimestamp(momentTimestamp)
    if (seconds === null) { setMomentError('Enter a timestamp like 0:47.'); return }
    const comment = momentComment.trim()
    if (!comment) { setMomentError('Enter a comment.'); return }

    setMomentSaving(true)
    setMomentError(null)
    try {
      const saved = await momentsApi.createMoment({
        trackId: track.id,
        trackName: track.name,
        albumId: track.album.id,
        albumName: track.album.name,
        albumImage: track.album.images[0]?.url ?? null,
        timestampSeconds: seconds,
        commentText: comment,
      })
      setMoments(prev => [...prev, saved].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds))
      setMomentFormOpen(false)
      setMomentTimestamp('')
      setMomentComment('')
    } catch (err: unknown) {
      setMomentError(err instanceof Error ? err.message : 'Failed to add moment.')
    } finally {
      setMomentSaving(false)
    }
  }

  async function handleDeleteMoment(moment: Moment) {
    try {
      await momentsApi.deleteMoment(moment.id)
      setMoments(prev => prev.filter(m => m.id !== moment.id))
    } catch {
      // Best-effort — the pill just stays put if the delete fails.
    }
  }

  if (loading) return <div className="track-detail-status"><div className="spinner" /></div>
  if (error || !track) return <div className="track-detail-status">{error ?? 'Song not found.'}</div>

  const album = track.album
  const image = album?.images[0]?.url
  const artists = track.artists.map(a => a.name).join(', ')

  const ratingCount = communityRatings.length
  const avgRating = ratingCount > 0
    ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / ratingCount
    : 0

  const otherReviews = communityRatings.filter(
    r => r.user_id !== user?.id && r.review && r.review.trim().length > 0
  )

  return (
    <>
      <div className="track-detail">
        {/* ── Hero ── */}
        <div className="track-hero">
          {image && (
            <div className="track-hero-bg" style={{ backgroundImage: `url(${image})` }} />
          )}
          <div className="track-hero-content">
            <Link to="/" className="back-btn">
              <BackIcon /> Search
            </Link>

            <div className="track-hero-body">
              {image
                ? <img className="track-cover" src={image} alt={track.name} />
                : <div className="track-cover-placeholder" />
              }

              <div className="track-info">
                <p className="track-type-label">Song</p>
                <h1 className="track-name-heading">{track.name}</h1>
                <p className="track-artists">{artists}</p>
                <div className="track-stats">
                  {album && <span>{album.name}</span>}
                  <span className="track-stats-dot">·</span>
                  <span>{formatDuration(track.duration_ms)}</span>
                </div>

                {ratingCount > 0 && (
                  <div className="community-rating-pill">
                    <span className="community-rating-star">★</span>
                    <span className="community-rating-value">{avgRating.toFixed(1)}</span>
                    <span className="community-rating-count">
                      from {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
                    </span>
                  </div>
                )}

                <div className="track-actions">
                  {myRating ? (
                    <button className="btn-rated" onClick={openRating}>
                      <InlineStars rating={myRating.rating} />
                      <span className="btn-rated-value">{myRating.rating}</span>
                      <span className="btn-rated-edit">Edit</span>
                    </button>
                  ) : (
                    <button className="btn-rate" onClick={openRating}>
                      ★ Rate this song
                    </button>
                  )}

                  {track.external_urls?.spotify && (
                    <a
                      className="btn-spotify"
                      href={track.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SpotifyIcon /> Open in Spotify
                    </a>
                  )}

                  <button type="button" className="btn-moment" onClick={openMomentForm}>
                    + moment
                  </button>

                  {album && (
                    <AddToListButton
                      item={{
                        albumId: album.id,
                        albumName: album.name,
                        albumArtist: album.artists.map(a => a.name).join(', '),
                        albumImage: image ?? null,
                        trackId: track.id,
                        trackName: track.name,
                      }}
                    />
                  )}

                  {album && (
                    <Link className="btn-album-link" to={`/album/${album.id}`}>
                      View full album →
                    </Link>
                  )}
                </div>

                {signInPrompt && (
                  <p className="sign-in-prompt">
                    <Link to="/profile">Sign in</Link> to rate songs and leave moments
                  </p>
                )}

                {myRating?.review && (
                  <blockquote className="my-review">
                    <p>{myRating.review}</p>
                    <footer>Your review</footer>
                  </blockquote>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Moments ── */}
        <div className="moments-section">
          <p className="moments-heading">Moments</p>

          {moments.length === 0 && !momentFormOpen && (
            <p className="moments-empty">No moments yet. Be the first to pin one.</p>
          )}

          {moments.length > 0 && (
            <div className="track-moments">
              {moments.map(m => {
                const mp = momentProfiles[m.user_id]
                return (
                  <div key={m.id} className="moment-pill">
                    <span className="moment-timestamp">{formatTimestamp(m.timestamp_seconds)}</span>
                    <span className="moment-sep">—</span>
                    <span className="moment-comment">{m.comment_text}</span>
                    <span className="moment-sep">—</span>
                    <span className="moment-author">@{mp?.username ?? 'fan'}</span>
                    {user?.id === m.user_id && (
                      <button
                        type="button"
                        className="moment-delete"
                        onClick={() => handleDeleteMoment(m)}
                        aria-label="Delete moment"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {momentFormOpen && (
            <>
              <form className="moment-form" onSubmit={handleAddMoment}>
                <input
                  className="moment-form-timestamp"
                  placeholder="0:47"
                  value={momentTimestamp}
                  onChange={e => setMomentTimestamp(e.target.value)}
                  maxLength={6}
                  autoFocus
                />
                <input
                  className="moment-form-comment"
                  placeholder="What happens here?"
                  value={momentComment}
                  onChange={e => setMomentComment(e.target.value)}
                  maxLength={200}
                />
                <button type="submit" className="moment-form-save" disabled={momentSaving}>
                  {momentSaving ? '…' : 'Add'}
                </button>
                <button type="button" className="moment-form-cancel" onClick={closeMomentForm}>
                  Cancel
                </button>
              </form>
              {momentError && <p className="moment-error">{momentError}</p>}
            </>
          )}
        </div>

        {/* ── Community reviews ── */}
        {otherReviews.length > 0 && (
          <div className="community-reviews">
            <p className="community-reviews-heading">
              Reviews ({otherReviews.length})
            </p>
            <div className="community-reviews-list">
              {otherReviews.map(r => {
                const profile = reviewerProfiles[r.user_id]
                return (
                  <div key={r.id} className="community-review">
                    <div
                      className="community-review-avatar"
                      style={{ background: reviewerColor(r.user_id) }}
                    >
                      {reviewerInitial(profile)}
                    </div>
                    <div className="community-review-body">
                      <div className="community-review-header">
                        <span className="community-review-name">{reviewerName(profile)}</span>
                        <InlineStars rating={r.rating} />
                        <span className="community-review-date">
                          {format(new Date(r.created_at), 'MMM d, yyyy')}
                        </span>
                        <FollowButton
                          targetUserId={r.user_id}
                          isFollowing={followingIds.has(r.user_id)}
                          signedIn={!!user}
                          onChange={following => handleFollowChange(r.user_id, following)}
                          onRequireSignIn={() => setSignInPrompt(true)}
                        />
                      </div>
                      <p className="community-review-text">{r.review}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {ratingOpen && album && (
        <RatingModal
          album={album}
          track={track}
          existing={myRating}
          onClose={() => setRatingOpen(false)}
          onSaved={handleRatingSaved}
        />
      )}
    </>
  )
}
