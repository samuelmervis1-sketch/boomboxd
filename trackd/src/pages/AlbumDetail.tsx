import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import { spotifyApi, type SpotifyAlbum, type SpotifyTrack } from '../services/spotifyApi'
import { supabase } from '../lib/supabase'
import { ratingsApi, type Rating } from '../lib/ratingsApi'
import { profilesApi, type Profile } from '../lib/profilesApi'
import { momentsApi, type Moment } from '../lib/momentsApi'
import { followsApi } from '../lib/followsApi'
import { reviewLikesApi, type LikeInfo } from '../lib/reviewLikesApi'
import { formatDuration } from '../lib/format'
import { reviewerColor, reviewerName, reviewerInitial } from '../lib/reviewerDisplay'
import RatingModal, { StarGlyph } from '../components/RatingModal'
import ShareCardModal from '../components/ShareCardModal'
import FollowButton from '../components/FollowButton'
import AddToListButton from '../components/AddToListButton'
import LikeButton from '../components/LikeButton'
import Seo from '../components/Seo'
import { useDominantColor } from '../lib/useDominantColor'
import './AlbumDetail.css'

// ── Helpers ────────────────────────────────────────────────

function totalRuntime(tracks: SpotifyTrack[]): string {
  const ms = tracks.reduce((sum, t) => sum + t.duration_ms, 0)
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(mins / 60)
  return hrs > 0 ? `${hrs} hr ${mins % 60} min` : `${mins} min`
}

function featArtists(track: SpotifyTrack, albumArtistIds: Set<string>): string {
  const feat = track.artists.filter(a => !albumArtistIds.has(a.id))
  return feat.length ? feat.map(a => a.name).join(', ') : ''
}

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

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
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

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>()

  const [album, setAlbum]       = useState<SpotifyAlbum | null>(null)
  const [tracks, setTracks]     = useState<SpotifyTrack[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const [user, setUser]         = useState<User | null>(null)
  const [myRating, setMyRating] = useState<Rating | null>(null)
  const [ratingTarget, setRatingTarget] = useState<SpotifyTrack | 'album' | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [signInPrompt, setSignInPrompt] = useState(false)

  const [communityRatings, setCommunityRatings] = useState<Rating[]>([])
  const [trackCommunityRatings, setTrackCommunityRatings] = useState<Rating[]>([])
  const [myTrackRatings, setMyTrackRatings] = useState<Rating[]>([])
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, Profile>>({})
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [likes, setLikes] = useState<Record<string, LikeInfo>>({})

  const [momentsByTrack, setMomentsByTrack] = useState<Record<string, Moment[]>>({})
  const [momentProfiles, setMomentProfiles] = useState<Record<string, Profile>>({})
  const [momentFormTrack, setMomentFormTrack] = useState<string | null>(null)
  const [momentTimestamp, setMomentTimestamp] = useState('')
  const [momentComment, setMomentComment] = useState('')
  const [momentSaving, setMomentSaving] = useState(false)
  const [momentError, setMomentError] = useState<string | null>(null)

  // Load album + tracks
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([spotifyApi.getAlbum(id), spotifyApi.getAlbumTracks(id)])
      .then(([albumData, tracksData]) => {
        setAlbum(albumData)
        setTracks(tracksData.items)
      })
      .catch(() => setError('Could not load album. Check your connection.'))
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

  // Load existing rating whenever user or album changes
  useEffect(() => {
    if (!user || !id) { setMyRating(null); return }
    ratingsApi.getMyRating(id)
      .then(setMyRating)
      .catch(() => setMyRating(null))
  }, [user?.id, id])

  // Load this user's existing track ratings for this album
  useEffect(() => {
    if (!user || !id) { setMyTrackRatings([]); return }
    ratingsApi.getMyTrackRatingsForAlbum(id)
      .then(setMyTrackRatings)
      .catch(() => setMyTrackRatings([]))
  }, [user?.id, id])

  // Load community ratings (album + per-track) for this album
  useEffect(() => {
    if (!id) return
    Promise.all([ratingsApi.getAlbumRatings(id), ratingsApi.getTrackRatings(id)])
      .then(([albumRatings, trackRatings]) => {
        setCommunityRatings(albumRatings)
        setTrackCommunityRatings(trackRatings)
      })
      .catch(() => {
        setCommunityRatings([])
        setTrackCommunityRatings([])
      })
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

  // Load like counts + whether I've liked each review shown below
  useEffect(() => {
    if (!user) { setLikes({}); return }
    const ids = communityRatings
      .filter(r => r.user_id !== user.id && r.review && r.review.trim().length > 0)
      .map(r => r.id)
    if (ids.length === 0) { setLikes({}); return }
    reviewLikesApi.getLikesForRatings(ids)
      .then(setLikes)
      .catch(() => setLikes({}))
  }, [communityRatings, user?.id])

  // Load moments (timestamped comments) for every track on this album
  useEffect(() => {
    if (!id) return
    momentsApi.getMomentsForAlbum(id)
      .then(moments => {
        const grouped: Record<string, Moment[]> = {}
        for (const m of moments) {
          (grouped[m.spotify_track_id] ??= []).push(m)
        }
        setMomentsByTrack(grouped)
      })
      .catch(() => setMomentsByTrack({}))
  }, [id])

  // Load profiles for anyone who's left a moment, to show @username
  useEffect(() => {
    const ids = [...new Set(Object.values(momentsByTrack).flat().map(m => m.user_id))]
    if (ids.length === 0) { setMomentProfiles({}); return }
    profilesApi.getProfiles(ids)
      .then(profiles => setMomentProfiles(Object.fromEntries(profiles.map(p => [p.id, p]))))
      .catch(() => setMomentProfiles({}))
  }, [momentsByTrack])

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
    setRatingTarget('album')
  }

  function openTrackRating(track: SpotifyTrack) {
    if (!user) { setSignInPrompt(true); return }
    setSignInPrompt(false)
    setRatingTarget(track)
  }

  function handleRatingSaved(rating: Rating | null) {
    if (ratingTarget && ratingTarget !== 'album') {
      const trackId = ratingTarget.id
      setMyTrackRatings(prev => {
        const rest = prev.filter(r => r.spotify_track_id !== trackId)
        return rating ? [...rest, rating] : rest
      })
      if (id) ratingsApi.getTrackRatings(id).then(setTrackCommunityRatings).catch(() => {})
    } else {
      setMyRating(rating)
      if (id) ratingsApi.getAlbumRatings(id).then(setCommunityRatings).catch(() => {})
    }
    setRatingTarget(null)
  }

  // Hooks must run unconditionally, ahead of the loading/error early returns below.
  const dominantColor = useDominantColor(album?.images[0]?.url)

  if (loading) return <div className="album-detail-status"><div className="spinner" /></div>
  if (error || !album) return <div className="album-detail-status">{error ?? 'Album not found.'}</div>

  const image = album.images[0]?.url
  const artists = album.artists.map(a => a.name).join(', ')
  const year = album.release_date?.slice(0, 4)
  const albumArtistIds = new Set(album.artists.map(a => a.id))

  const ratingCount = communityRatings.length
  const avgRating = ratingCount > 0
    ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / ratingCount
    : 0

  const otherReviews = communityRatings.filter(
    r => r.user_id !== user?.id && r.review && r.review.trim().length > 0
  )

  const trackRatingStats = new Map<string, { sum: number; count: number }>()
  for (const r of trackCommunityRatings) {
    if (!r.spotify_track_id) continue
    const cur = trackRatingStats.get(r.spotify_track_id) ?? { sum: 0, count: 0 }
    cur.sum += r.rating
    cur.count += 1
    trackRatingStats.set(r.spotify_track_id, cur)
  }

  function openMomentForm(trackId: string) {
    if (!user) { setSignInPrompt(true); return }
    setSignInPrompt(false)
    setMomentFormTrack(trackId)
    setMomentTimestamp('')
    setMomentComment('')
    setMomentError(null)
  }

  function closeMomentForm() {
    setMomentFormTrack(null)
    setMomentError(null)
  }

  async function handleAddMoment(e: React.FormEvent, track: SpotifyTrack) {
    e.preventDefault()
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
        albumId: album!.id,
        albumName: album!.name,
        albumImage: album!.images[0]?.url ?? null,
        timestampSeconds: seconds,
        commentText: comment,
      })
      setMomentsByTrack(prev => {
        const existing = prev[track.id] ?? []
        const next = [...existing, saved].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
        return { ...prev, [track.id]: next }
      })
      setMomentFormTrack(null)
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
      setMomentsByTrack(prev => ({
        ...prev,
        [moment.spotify_track_id]: (prev[moment.spotify_track_id] ?? []).filter(m => m.id !== moment.id),
      }))
    } catch {
      // Best-effort — the pill just stays put if the delete fails.
    }
  }

  const seoDescription = ratingCount > 0
    ? `${album.name} by ${artists} — rated ${avgRating.toFixed(1)} stars on boomboxd`
    : `${album.name} by ${artists} on boomboxd`

  return (
    <>
      <Seo title={`${album.name} by ${artists}`} description={seoDescription} image={image} type="music.album" />

      <div className="album-detail">
        {/* ── Hero ── */}
        <div className="album-hero">
          {image && (
            <div className="album-hero-bg" style={{ backgroundImage: `url(${image})` }} />
          )}
          {dominantColor && (
            <div
              className="album-hero-tint"
              style={{
                background: `linear-gradient(to bottom, rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.15) 0%, transparent 60%)`,
              }}
            />
          )}
          <div className="album-hero-content">
            <Link to="/" className="back-btn">
              <BackIcon /> Search
            </Link>

            <div className="album-hero-body">
              {image
                ? <img className="album-cover" src={image} alt={album.name} />
                : <div className="album-cover-placeholder" />
              }

              <div className="album-info">
                <p className="album-type-label">Album</p>
                <h1 className="album-name">{album.name}</h1>
                <p className="album-artists">{artists}</p>
                <div className="album-stats">
                  {year && <span>{year}</span>}
                  {year && <span className="album-stats-dot">·</span>}
                  <span>{album.total_tracks} tracks</span>
                  {tracks.length > 0 && (
                    <>
                      <span className="album-stats-dot">·</span>
                      <span>{totalRuntime(tracks)}</span>
                    </>
                  )}
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

                <div className="album-actions">
                  {myRating ? (
                    <>
                      <button className="btn-rated" onClick={openRating}>
                        <InlineStars rating={myRating.rating} />
                        <span className="btn-rated-value">{myRating.rating}</span>
                        <span className="btn-rated-edit">Edit</span>
                      </button>
                      <button className="btn-share" onClick={() => setShareOpen(true)} aria-label="Share rating">
                        <ShareIcon /> Share
                      </button>
                    </>
                  ) : (
                    <button className="btn-rate" onClick={openRating}>
                      ★ Rate this album
                    </button>
                  )}

                  <a
                    className="btn-spotify"
                    href={album.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SpotifyIcon /> Open in Spotify
                  </a>

                  <AddToListButton
                    item={{
                      albumId: album.id,
                      albumName: album.name,
                      albumArtist: artists,
                      albumImage: image ?? null,
                    }}
                  />
                </div>

                {signInPrompt && (
                  <p className="sign-in-prompt">
                    <Link to="/profile">Sign in</Link> to rate albums and tracks
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

        {/* ── Tracklist ── */}
        <div className="tracklist">
          {signInPrompt && (
            <p className="sign-in-prompt tracklist-sign-in-prompt">
              <Link to="/profile">Sign in</Link> to rate albums and tracks
            </p>
          )}

          <div className="tracklist-header">
            <span>#</span>
            <span>Title</span>
            <span className="tracklist-header-duration">Duration</span>
          </div>

          {tracks.map((track, i) => {
            const feat = featArtists(track, albumArtistIds)
            const stats = trackRatingStats.get(track.id)
            const trackAvg = stats ? stats.sum / stats.count : null
            const trackMoments = momentsByTrack[track.id] ?? []
            const formOpen = momentFormTrack === track.id
            return (
              <div key={track.id} className="track-block">
                <div
                  className="track-row"
                  onClick={() => openTrackRating(track)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openTrackRating(track)
                    }
                  }}
                >
                  <div className="track-num-wrap">
                    <span className="track-num">{i + 1}</span>
                  </div>
                  <div className="track-body">
                    <span className="track-name">{track.name}</span>
                    {feat && <span className="track-feat">feat. {feat}</span>}
                  </div>
                  <div className="track-meta">
                    {trackAvg !== null && (
                      <span
                        className="track-rating-badge"
                        title={`${trackAvg.toFixed(1)} avg from ${stats!.count} rating${stats!.count === 1 ? '' : 's'}`}
                      >
                        <span className="track-rating-star">★</span>
                        {trackAvg.toFixed(1)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="track-moment-btn"
                      onClick={e => { e.stopPropagation(); openMomentForm(track.id) }}
                      title="Add a moment"
                    >
                      + moment
                    </button>
                    <span className="track-duration">{formatDuration(track.duration_ms)}</span>
                  </div>
                </div>

                {(trackMoments.length > 0 || formOpen) && (
                  <div className="track-moments">
                    {trackMoments.map(m => {
                      const mp = momentProfiles[m.user_id]
                      return (
                        <div key={m.id} className="moment-pill">
                          <span className="moment-timestamp">{formatTimestamp(m.timestamp_seconds)}</span>
                          <span className="moment-sep">—</span>
                          <span className="moment-comment">{m.comment_text}</span>
                          <span className="moment-sep">—</span>
                          {mp?.username
                            ? <Link to={`/user/${mp.username}`} className="moment-author">@{mp.username}</Link>
                            : <span className="moment-author">@fan</span>}
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

                    {formOpen && (
                      <>
                        <form className="moment-form" onSubmit={e => handleAddMoment(e, track)}>
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
                )}
              </div>
            )
          })}
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
                const avatar = (
                  <div
                    className="community-review-avatar"
                    style={{ background: reviewerColor(r.user_id) }}
                  >
                    {reviewerInitial(profile)}
                  </div>
                )
                return (
                  <div key={r.id} className="community-review">
                    {profile?.username
                      ? <Link to={`/user/${profile.username}`}>{avatar}</Link>
                      : avatar}
                    <div className="community-review-body">
                      <div className="community-review-header">
                        {profile?.username
                          ? <Link to={`/user/${profile.username}`} className="community-review-name">{reviewerName(profile)}</Link>
                          : <span className="community-review-name">{reviewerName(profile)}</span>}
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
                      {user && (
                        <div className="community-review-footer">
                          <LikeButton
                            ratingId={r.id}
                            count={likes[r.id]?.count ?? 0}
                            liked={likes[r.id]?.liked ?? false}
                            onChange={(liked, count) =>
                              setLikes(prev => ({ ...prev, [r.id]: { liked, count } }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {ratingTarget && (
        <RatingModal
          album={album}
          track={ratingTarget !== 'album' ? ratingTarget : undefined}
          existing={
            ratingTarget === 'album'
              ? myRating
              : myTrackRatings.find(r => r.spotify_track_id === ratingTarget.id) ?? null
          }
          onClose={() => setRatingTarget(null)}
          onSaved={handleRatingSaved}
        />
      )}

      {shareOpen && myRating && (
        <ShareCardModal
          album={album}
          rating={myRating}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  )
}
