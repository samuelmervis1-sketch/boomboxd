import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { discoverApi, type TopRatedAlbum, type TopRatedTrack } from '../lib/discoverApi'
import { profilesApi, type Profile } from '../lib/profilesApi'
import type { Rating } from '../lib/ratingsApi'
import { StarGlyph } from '../components/RatingModal'
import EmptyState, { CompassIcon } from '../components/EmptyState'
import './Discover.css'

function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function reviewerLabel(profile: Profile | undefined): string {
  return profile?.username ? `@${profile.username}` : 'a boomboxd fan'
}

function RatingPill({ avg, count }: { avg: number; count: number }) {
  return (
    <span className="discover-rating-pill">
      <span className="discover-rating-star">★</span>
      <span className="discover-rating-value">{avg.toFixed(1)}</span>
      <span className="discover-rating-count">({count})</span>
    </span>
  )
}

function CardArt({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="discover-card-art">
      {src ? (
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <div className="discover-card-art-placeholder">
          <MusicIcon />
        </div>
      )}
    </div>
  )
}

function Row({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="discover-row">
      <p className="section-heading">{heading}</p>
      <div className="discover-scroll">{children}</div>
    </div>
  )
}

export default function Discover() {
  const [topAlbums, setTopAlbums] = useState<TopRatedAlbum[]>([])
  const [recentAlbums, setRecentAlbums] = useState<Rating[]>([])
  const [topSongs, setTopSongs] = useState<TopRatedTrack[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    Promise.all([
      discoverApi.getTopRatedAlbums(10, 2),
      discoverApi.getRecentlyRatedAlbums(10),
      discoverApi.getTopRatedSongs(10, 2),
    ])
      .then(([albums, recent, songs]) => {
        if (cancelled) return
        setTopAlbums(albums)
        setRecentAlbums(recent)
        setTopSongs(songs)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const ids = [...new Set(recentAlbums.map(r => r.user_id))]
    if (ids.length === 0) { setProfiles({}); return }
    profilesApi.getProfiles(ids)
      .then(data => setProfiles(Object.fromEntries(data.map(p => [p.id, p]))))
      .catch(() => setProfiles({}))
  }, [recentAlbums])

  const nothingToShow = topAlbums.length === 0 && recentAlbums.length === 0 && topSongs.length === 0

  return (
    <div className="page discover-page">
      <h1 className="page-title">Discover</h1>
      <p className="page-subtitle">Find new music through what other listeners are rating.</p>

      {loading ? (
        <div className="discover-status"><div className="spinner" /></div>
      ) : error ? (
        <div className="discover-status">Couldn't load Discover right now. Try again shortly.</div>
      ) : nothingToShow ? (
        <EmptyState
          icon={<CompassIcon />}
          title="Nothing rated yet"
          text="Once people start rating songs and albums, the highlights will show up here. Be the first — search for something you love and rate it."
          to="/"
          actionLabel="Search for music"
        />
      ) : (
        <div className="discover-sections">
          {topAlbums.length > 0 && (
            <Row heading="Top Rated on boomboxd">
              {topAlbums.map(a => (
                <Link key={a.albumId} to={`/album/${a.albumId}`} className="discover-card">
                  <CardArt src={a.albumImage} alt={a.albumName} />
                  <div className="discover-card-info">
                    <p className="discover-card-title" title={a.albumName}>{a.albumName}</p>
                    <p className="discover-card-artist" title={a.albumArtist}>{a.albumArtist}</p>
                    <RatingPill avg={a.avgRating} count={a.ratingCount} />
                  </div>
                </Link>
              ))}
            </Row>
          )}

          {recentAlbums.length > 0 && (
            <Row heading="Recently Rated">
              {recentAlbums.map(r => (
                <Link key={r.id} to={`/album/${r.album_id}`} className="discover-card">
                  <CardArt src={r.album_image} alt={r.album_name} />
                  <div className="discover-card-info">
                    <p className="discover-card-title" title={r.album_name}>{r.album_name}</p>
                    <p className="discover-card-artist" title={r.album_artist}>{r.album_artist}</p>
                    <div className="discover-card-reviewer">
                      <span className="inline-stars">
                        {[1, 2, 3, 4, 5].map(n => <StarGlyph key={n} value={r.rating} pos={n} />)}
                      </span>
                      <span className="discover-card-reviewer-name">{reviewerLabel(profiles[r.user_id])}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </Row>
          )}

          {topSongs.length > 0 && (
            <Row heading="Top Rated Songs">
              {topSongs.map(t => (
                <Link key={t.trackId} to={`/track/${t.trackId}`} className="discover-card">
                  <CardArt src={t.albumImage} alt={t.trackName} />
                  <div className="discover-card-info">
                    <p className="discover-card-title" title={t.trackName}>{t.trackName}</p>
                    <p className="discover-card-artist" title={t.albumArtist}>{t.albumArtist}</p>
                    <RatingPill avg={t.avgRating} count={t.ratingCount} />
                  </div>
                </Link>
              ))}
            </Row>
          )}
        </div>
      )}
    </div>
  )
}
