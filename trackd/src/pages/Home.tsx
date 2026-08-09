import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { spotifyApi, type SpotifyAlbum, type SpotifyTrack } from '../services/spotifyApi'
import { supabase } from '../lib/supabase'
import { ratingsApi, type Rating } from '../lib/ratingsApi'
import { formatDuration } from '../lib/format'
import RatingModal from '../components/RatingModal'
import './Home.css'

type Tab = 'songs' | 'albums'

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

function AlbumCard({ album }: { album: SpotifyAlbum }) {
  const image = album.images[0]?.url
  const artist = album.artists.map(a => a.name).join(', ')
  const year = album.release_date?.slice(0, 4) ?? ''

  return (
    <Link to={`/album/${album.id}`} className="album-card">
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
  )
}

function TrackCard({ track, onRate }: { track: SpotifyTrack; onRate: (track: SpotifyTrack) => void }) {
  const image = track.album?.images[0]?.url
  const artist = track.artists.map(a => a.name).join(', ')

  return (
    <div
      className="track-card"
      onClick={() => onRate(track)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onRate(track)
        }
      }}
    >
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
      {track.id && (
        <Link
          to={`/track/${track.id}`}
          className="track-card-view-link"
          onClick={e => e.stopPropagation()}
        >
          View
        </Link>
      )}
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
  const [ratingExisting, setRatingExisting] = useState<Rating | null>(null)
  const [signInPrompt, setSignInPrompt] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    runSearch(query, tab)
  }

  function handleTabChange(next: Tab) {
    setTab(next)
    setError(null)
  }

  async function openTrackRating(track: SpotifyTrack) {
    if (!user) { setSignInPrompt(true); return }
    if (!track.album) return
    setSignInPrompt(false)
    setRatingTrack(track)
    try {
      setRatingExisting(await ratingsApi.getMyRatingForTrack(track.id))
    } catch {
      setRatingExisting(null)
    }
  }

  function closeRating() {
    setRatingTrack(null)
    setRatingExisting(null)
  }

  const results = tab === 'songs' ? trackResults : albumResults
  const showEmpty = !loading && !error && query.trim().length >= 2 && results.length === 0
  const showPrompt = !loading && !error && query.trim().length < 2

  return (
    <div className="home">
      <div className="search-wrap">
        <span className="search-eyebrow">boomboxd</span>
        <h1 className="search-heading">What are you listening to?</h1>

        <div className="search-tabs" role="tablist">
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

        <form className="search-form" onSubmit={handleSubmit}>
          <input
            className="search-input"
            type="search"
            placeholder={tab === 'songs' ? 'Search songs, artists…' : 'Search albums, artists…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button className="search-btn" type="submit" aria-label="Search">
            <SearchIcon />
          </button>
        </form>

        {signInPrompt && (
          <p className="sign-in-prompt">
            <Link to="/profile">Sign in</Link> to rate songs
          </p>
        )}
      </div>

      {loading && (
        <div className="search-status">
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="search-status">{error}</div>
      )}

      {showPrompt && (
        <div className="search-status">Type at least 2 characters to search</div>
      )}

      {showEmpty && (
        <div className="search-status">No results for "{query}"</div>
      )}

      {!loading && tab === 'songs' && trackResults.length > 0 && (
        <>
          <p className="results-meta">{total.toLocaleString()} songs found</p>
          <div className="track-list">
            {trackResults.map(track => (
              <TrackCard key={track.id} track={track} onRate={openTrackRating} />
            ))}
          </div>
        </>
      )}

      {!loading && tab === 'albums' && albumResults.length > 0 && (
        <>
          <p className="results-meta">{total.toLocaleString()} albums found</p>
          <div className="album-grid">
            {albumResults.map(album => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </>
      )}

      {ratingTrack && ratingTrack.album && (
        <RatingModal
          album={ratingTrack.album}
          track={ratingTrack}
          existing={ratingExisting}
          onClose={closeRating}
          onSaved={closeRating}
        />
      )}
    </div>
  )
}
