import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { spotifyApi, type SpotifyAlbum } from '../services/spotifyApi'
import './Home.css'

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

export default function Home() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyAlbum[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setTotal(0)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await spotifyApi.search(q.trim(), 10)
      setResults(data.albums.items.filter(Boolean))
      setTotal(data.albums.total)
    } catch {
      setError('Could not reach Spotify. Check your API credentials.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 420)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, runSearch])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    runSearch(query)
  }

  const showEmpty = !loading && !error && query.trim().length >= 2 && results.length === 0
  const showPrompt = !loading && !error && query.trim().length < 2

  return (
    <div className="home">
      <div className="search-wrap">
        <span className="search-eyebrow">boomboxd</span>
        <h1 className="search-heading">What are you listening to?</h1>
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            className="search-input"
            type="search"
            placeholder="Search albums, artists…"
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

      {!loading && results.length > 0 && (
        <>
          <p className="results-meta">{total.toLocaleString()} albums found</p>
          <div className="album-grid">
            {results.map(album => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
