import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { spotifyApi, type SpotifyAlbum, type SpotifyTrack } from '../services/spotifyApi'
import { supabase } from '../lib/supabase'
import { ratingsApi, type Rating } from '../lib/ratingsApi'
import { discoverApi, type TrendingItem } from '../lib/discoverApi'
import { formatDuration } from '../lib/format'
import RatingModal from '../components/RatingModal'
import Seo from '../components/Seo'
import './Home.css'

type Tab = 'songs' | 'albums'

const SEARCH_EXAMPLES = ['Kendrick Lamar', 'APT', 'Brat']
const WELCOME_DISMISSED_KEY = 'boomboxd:welcome-dismissed'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function formatRatingValue(rating: number) {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1)
}

function RateButton({
  rating,
  label,
  className = '',
  onClick,
}: {
  rating: Rating | null
  label: string
  className?: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      className={`rate-btn${rating ? ' rate-btn-rated' : ''} ${className}`.trim()}
      onClick={onClick}
      aria-label={
        rating
          ? `You rated this ${formatRatingValue(rating.rating)} stars. Tap to edit.`
          : label
      }
    >
      <span className="rate-btn-star" aria-hidden="true">★</span>
      {rating && <span className="rate-btn-value">{formatRatingValue(rating.rating)}</span>}
    </button>
  )
}

function AlbumCard({
  album,
  rating,
  onRate,
}: {
  album: SpotifyAlbum
  rating: Rating | null
  onRate: (album: SpotifyAlbum) => void
}) {
  const image = album.images[0]?.url
  const artist = album.artists.map(a => a.name).join(', ')
  const year = album.release_date?.slice(0, 4) ?? ''

  return (
    <div className="album-card">
      <Link to={`/album/${album.id}`} className="album-card-link">
        <div className="album-card-art">
          {image ? (
            <img src={image} alt={album.name} loading="lazy" />
          ) : (
            <div className="album-card-art-placeholder">
              <MusicIcon />
            </div>
          )}
        </div>
        <div className="album-card-info">
          <div className="album-card-title" title={album.name}>{album.name}</div>
          <div className="album-card-meta">
            <span className="album-card-artist" title={artist}>{artist}</span>
            {year && (
              <>
                <span className="album-card-dot">·</span>
                <span className="album-card-year">{year}</span>
              </>
            )}
          </div>
        </div>
      </Link>
      <RateButton
        rating={rating}
        label="Rate this album"
        className="rate-btn-corner"
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          onRate(album)
        }}
      />
    </div>
  )
}

function TrackCard({
  track,
  rating,
  onRate,
}: {
  track: SpotifyTrack
  rating: Rating | null
  onRate: (track: SpotifyTrack) => void
}) {
  const image = track.album?.images[0]?.url
  const artist = track.artists.map(a => a.name).join(', ')

  return (
    <div className="track-card">
      <Link to={`/track/${track.id}`} className="track-card-link">
        <div className="track-card-art">
          {image ? (
            <img src={image} alt={track.name} loading="lazy" />
          ) : (
            <div className="track-card-art-placeholder">
              <MusicIcon />
            </div>
          )}
        </div>
        <div className="track-card-info">
          <div className="track-card-title" title={track.name}>{track.name}</div>
          <div className="track-card-meta">
            <span className="track-card-artist" title={artist}>{artist}</span>
          </div>
        </div>
        <span className="track-card-duration">{formatDuration(track.duration_ms)}</span>
      </Link>
      <RateButton
        rating={rating}
        label="Rate this song"
        className="rate-btn-inline"
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          onRate(track)
        }}
      />
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('songs')
  const [query, setQuery] = useState('')
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([])
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [ratingTrack, setRatingTrack] = useState<SpotifyTrack | null>(null)
  const [ratingAlbum, setRatingAlbum] = useState<SpotifyAlbum | null>(null)
  const [myTrackRatings, setMyTrackRatings] = useState<Record<string, Rating>>({})
  const [myAlbumRatings, setMyAlbumRatings] = useState<Record<string, Rating>>({})
  const [signInPrompt, setSignInPrompt] = useState(false)
  const [signInGate, setSignInGate] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem(WELCOME_DISMISSED_KEY) === '1'
  )
  const [trending, setTrending] = useState<TrendingItem[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Trending row only makes sense before a search is typed, and only for
  // signed-in users (signed-out users can't search at all yet).
  useEffect(() => {
    if (!user || query.trim().length >= 2) return
    let cancelled = false
    setTrendingLoading(true)
    discoverApi.getTrending(12, 7)
      .then(items => { if (!cancelled) setTrending(items) })
      .catch(() => { if (!cancelled) setTrending([]) })
      .finally(() => { if (!cancelled) setTrendingLoading(false) })
    return () => { cancelled = true }
  }, [user, query])

  function dismissWelcome() {
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    setWelcomeDismissed(true)
  }

  const runSearch = useCallback(async (q: string, activeTab: Tab) => {
    if (q.trim().length < 2) {
      setTrackResults([])
      setAlbumResults([])
      setTotal(0)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'songs') {
        const data = await spotifyApi.searchTracks(q.trim(), 10)
        const items = data.tracks.items
          .filter(Boolean)
          .slice()
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        setTrackResults(items)
        setTotal(data.tracks.total)
      } else {
        const data = await spotifyApi.search(q.trim(), 10)
        setAlbumResults(data.albums.items.filter(Boolean))
        setTotal(data.albums.total)
      }
    } catch {
      setError('Could not reach Spotify. Check your API credentials.')
      setTrackResults([])
      setAlbumResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query, tab), 420)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, tab, runSearch])

  // Batch-fetch the signed-in user's existing ratings for the visible search
  // results so rated tracks/albums can show their rating inline.
  useEffect(() => {
    if (!user || trackResults.length === 0) {
      setMyTrackRatings({})
      return
    }
    let cancelled = false
    ratingsApi.getMyRatingsForTracks(trackResults.map(t => t.id))
      .then(map => { if (!cancelled) setMyTrackRatings(map) })
      .catch(() => { if (!cancelled) setMyTrackRatings({}) })
    return () => { cancelled = true }
  }, [trackResults, user])

  useEffect(() => {
    if (!user || albumResults.length === 0) {
      setMyAlbumRatings({})
      return
    }
    let cancelled = false
    ratingsApi.getMyRatingsForAlbums(albumResults.map(a => a.id))
      .then(map => { if (!cancelled) setMyAlbumRatings(map) })
      .catch(() => { if (!cancelled) setMyAlbumRatings({}) })
    return () => { cancelled = true }
  }, [albumResults, user])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    runSearch(query, tab)
  }

  function handleTabChange(next: Tab) {
    setTab(next)
    setError(null)
  }

  function openTrackRating(track: SpotifyTrack) {
    if (!user) { setSignInPrompt(true); return }
    if (!track.album) return
    setSignInPrompt(false)
    setRatingTrack(track)
  }

  function openAlbumRating(album: SpotifyAlbum) {
    if (!user) { setSignInPrompt(true); return }
    setSignInPrompt(false)
    setRatingAlbum(album)
  }

  function handleTrackRated(track: SpotifyTrack, saved: Rating | null) {
    setMyTrackRatings(prev => {
      const next = { ...prev }
      if (saved) next[track.id] = saved
      else delete next[track.id]
      return next
    })
    setRatingTrack(null)
  }

  function handleAlbumRated(album: SpotifyAlbum, saved: Rating | null) {
    setMyAlbumRatings(prev => {
      const next = { ...prev }
      if (saved) next[album.id] = saved
      else delete next[album.id]
      return next
    })
    setRatingAlbum(null)
  }

  const results = tab === 'songs' ? trackResults : albumResults
  const showEmpty = !loading && !error && query.trim().length >= 2 && results.length === 0
  const showPrompt = !loading && !error && query.trim().length < 2

  return (
    <div className="home">
      <Seo />

      {user && !welcomeDismissed && (
        <div className="welcome-banner">
          <div className="welcome-banner-body">
            <p className="welcome-banner-title">Welcome to boomboxd! 🎧</p>
            <p className="welcome-banner-text">
              Start by searching for a song you love and rating it. Your ratings build
              your profile, and you can collect favourites into lists.
            </p>
          </div>
          <button
            type="button"
            className="welcome-banner-close"
            onClick={dismissWelcome}
            aria-label="Dismiss welcome message"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      <div className="search-wrap">
        <span className="search-eyebrow">boomboxd</span>
        <h1 className="search-heading">What are you listening to?</h1>
        <p className="search-tagline">Rate songs and albums. Share your taste.</p>

        <div className="search-tabs" role="tablist" aria-label="Search type">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'songs'}
            className={`search-tab${tab === 'songs' ? ' active' : ''}`}
            onClick={() => handleTabChange('songs')}
          >
            Songs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'albums'}
            className={`search-tab${tab === 'albums' ? ' active' : ''}`}
            onClick={() => handleTabChange('albums')}
          >
            Albums
          </button>
        </div>

        <form className={`search-form${user ? '' : ' search-form-disabled'}`} onSubmit={user ? handleSubmit : e => e.preventDefault()}>
          <input
            className={`search-input${user ? '' : ' search-input-disabled'}`}
            type="search"
            placeholder={user ? (tab === 'songs' ? 'Search songs, artists…' : 'Search albums, artists…') : 'Sign in to search songs...'}
            value={query}
            onChange={e => { if (user) setQuery(e.target.value) }}
            onMouseDown={e => { if (!user) { e.preventDefault(); setSignInGate(true) } }}
            onFocus={e => { if (!user) { e.target.blur(); setSignInGate(true) } }}
            readOnly={!user}
            tabIndex={user ? 0 : -1}
            autoFocus={!!user}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="search-btn"
            type={user ? 'submit' : 'button'}
            aria-label="Search"
            onClick={() => { if (!user) setSignInGate(true) }}
          >
            <SearchIcon />
          </button>
        </form>

        <p className="search-hint">
          Try searching{' '}
          {SEARCH_EXAMPLES.map((example, i) => (
            <span key={example}>
              {i > 0 && (i === SEARCH_EXAMPLES.length - 1 ? ' or ' : ', ')}
              <button
                type="button"
                className="search-hint-example"
                onClick={() => { if (user) setQuery(example); else setSignInGate(true) }}
              >
                {example}
              </button>
            </span>
          ))}
        </p>

        {signInPrompt && (
          <p className="sign-in-prompt">
            <Link to="/profile">Sign in</Link> to rate songs
          </p>
        )}
      </div>

      {signInGate && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSignInGate(false) }}>
          <div className="modal sign-in-gate" role="dialog" aria-modal="true" aria-label="Sign in required">
            <button className="modal-close sign-in-gate-close" onClick={() => setSignInGate(false)} aria-label="Close">×</button>
            <p className="sign-in-gate-text">Sign in to search and rate music</p>
            <Link to="/profile" className="btn-rate sign-in-gate-btn" onClick={() => setSignInGate(false)}>
              Sign in
            </Link>
          </div>
        </div>
      )}

      {loading && (
        <div className="search-status">
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="search-status">{error}</div>
      )}

      {showPrompt && !user && (
        <div className="how-it-works">
          <div className="how-it-works-step">
            <span className="how-it-works-num">1</span>
            <p className="how-it-works-title">Search</p>
            <p className="how-it-works-text">Find any song or album from Spotify's catalogue.</p>
          </div>
          <div className="how-it-works-step">
            <span className="how-it-works-num">2</span>
            <p className="how-it-works-title">Rate it</p>
            <p className="how-it-works-text">Give it up to five stars and write a short review.</p>
          </div>
          <div className="how-it-works-step">
            <span className="how-it-works-num">3</span>
            <p className="how-it-works-title">Share your taste</p>
            <p className="how-it-works-text">Build lists, follow friends, and compare ratings.</p>
          </div>
        </div>
      )}

      {showPrompt && user && (trendingLoading || trending.length > 0) && (
        <div className="trending-section">
          <p className="section-heading">Trending on boomboxd</p>
          {trendingLoading ? (
            <div className="search-status"><div className="spinner" /></div>
          ) : (
            <div className="trending-scroll">
              {trending.map(item => (
                <Link
                  key={`${item.type}:${item.id}`}
                  to={item.type === 'album' ? `/album/${item.id}` : `/track/${item.id}`}
                  className="trending-card"
                >
                  <div className="trending-card-art">
                    {item.image ? (
                      <img src={item.image} alt={item.name} loading="lazy" />
                    ) : (
                      <div className="trending-card-art-placeholder">
                        <MusicIcon />
                      </div>
                    )}
                  </div>
                  <div className="trending-card-info">
                    <p className="trending-card-title" title={item.name}>{item.name}</p>
                    <p className="trending-card-artist" title={item.artist}>{item.artist}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {showEmpty && (
        <div className="search-status">No results for "{query}"</div>
      )}

      {!loading && tab === 'songs' && trackResults.length > 0 && (
        <>
          <p className="results-meta">{total.toLocaleString()} songs found</p>
          <div className="track-list">
            {trackResults.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                rating={myTrackRatings[track.id] ?? null}
                onRate={openTrackRating}
              />
            ))}
          </div>
        </>
      )}

      {!loading && tab === 'albums' && albumResults.length > 0 && (
        <>
          <p className="results-meta">{total.toLocaleString()} albums found</p>
          <div className="album-grid">
            {albumResults.map(album => (
              <AlbumCard
                key={album.id}
                album={album}
                rating={myAlbumRatings[album.id] ?? null}
                onRate={openAlbumRating}
              />
            ))}
          </div>
        </>
      )}

      {ratingTrack && ratingTrack.album && (
        <RatingModal
          album={ratingTrack.album}
          track={ratingTrack}
          existing={myTrackRatings[ratingTrack.id] ?? null}
          onClose={() => setRatingTrack(null)}
          onSaved={saved => handleTrackRated(ratingTrack, saved)}
        />
      )}

      {ratingAlbum && (
        <RatingModal
          album={ratingAlbum}
          existing={myAlbumRatings[ratingAlbum.id] ?? null}
          onClose={() => setRatingAlbum(null)}
          onSaved={saved => handleAlbumRated(ratingAlbum, saved)}
        />
      )}
    </div>
  )
}
