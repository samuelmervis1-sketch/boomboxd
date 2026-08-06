import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { spotifyApi, type SpotifyAlbum, type SpotifyTrack } from '../services/spotifyApi'
import { supabase } from '../lib/supabase'
import { ratingsApi, type Rating } from '../lib/ratingsApi'
import RatingModal, { StarGlyph } from '../components/RatingModal'
import ShareCardModal from '../components/ShareCardModal'
import './AlbumDetail.css'

// ── Helpers ────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

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
  const [modalOpen, setModalOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [signInPrompt, setSignInPrompt] = useState(false)

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

  function openRating() {
    if (!user) { setSignInPrompt(true); return }
    setSignInPrompt(false)
    setModalOpen(true)
  }

  function handleRatingSaved(rating: Rating | null) {
    setMyRating(rating)
    setModalOpen(false)
  }

  if (loading) return <div className="album-detail-status"><div className="spinner" /></div>
  if (error || !album) return <div className="album-detail-status">{error ?? 'Album not found.'}</div>

  const image = album.images[0]?.url
  const artists = album.artists.map(a => a.name).join(', ')
  const year = album.release_date?.slice(0, 4)
  const albumArtistIds = new Set(album.artists.map(a => a.id))

  return (
    <>
      <div className="album-detail">
        {/* ── Hero ── */}
        <div className="album-hero">
          {image && (
            <div className="album-hero-bg" style={{ backgroundImage: `url(${image})` }} />
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

                <div className="album-actions">
                  <a
                    className="btn-primary"
                    href={album.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SpotifyIcon /> Open in Spotify
                  </a>

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
                      Rate this album
                    </button>
                  )}
                </div>

                {signInPrompt && (
                  <p className="sign-in-prompt">
                    <Link to="/profile">Sign in</Link> to rate albums
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
          <div className="tracklist-header">
            <span>#</span>
            <span>Title</span>
            <span className="tracklist-header-duration">Duration</span>
          </div>

          {tracks.map((track, i) => {
            const feat = featArtists(track, albumArtistIds)
            return (
              <div key={track.id} className="track-row">
                <div className="track-num-wrap">
                  <span className="track-num">{i + 1}</span>
                </div>
                <div className="track-body">
                  <span className="track-name">{track.name}</span>
                  {feat && <span className="track-feat">feat. {feat}</span>}
                </div>
                <span className="track-duration">{formatDuration(track.duration_ms)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {modalOpen && (
        <RatingModal
          album={album}
          existing={myRating}
          onClose={() => setModalOpen(false)}
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
