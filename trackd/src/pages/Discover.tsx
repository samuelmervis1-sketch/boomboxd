import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { discoverApi, type TopRatedAlbum, type TopRatedTrack, type RecommendedItem } from '../lib/discoverApi'
import { profilesApi, type Profile } from '../lib/profilesApi'
import { reviewLikesApi, type LikeInfo } from '../lib/reviewLikesApi'
import type { Rating } from '../lib/ratingsApi'
import { StarGlyph } from '../components/RatingModal'
import LikeButton from '../components/LikeButton'
import EmptyState, { CompassIcon } from '../components/EmptyState'
import Seo from '../components/Seo'
import { SkeletonList, SkeletonDiscoverCard, SkeletonBox } from '../components/Skeleton'
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
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [topAlbums, setTopAlbums] = useState<TopRatedAlbum[]>([])
  const [recentAlbums, setRecentAlbums] = useState<Rating[]>([])
  const [topSongs, setTopSongs] = useState<TopRatedTrack[]>([])
  const [recommended, setRecommended] = useState<RecommendedItem[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [likes, setLikes] = useState<Record<string, LikeInfo>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

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

  // "You may also like" — driven by the current user's own high ratings, so
  // it needs to (re)fetch whenever the signed-in user changes.
  useEffect(() => {
    if (!user) { setRecommended([]); return }
    let cancelled = false
    discoverApi.getRecommendations(user.id, 10)
      .then(items => { if (!cancelled) setRecommended(items) })
      .catch(() => { if (!cancelled) setRecommended([]) })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    const ids = [...new Set(recentAlbums.map(r => r.user_id))]
    if (ids.length === 0) { setProfiles({}); return }
    profilesApi.getProfiles(ids)
      .then(data => setProfiles(Object.fromEntries(data.map(p => [p.id, p]))))
      .catch(() => setProfiles({}))
  }, [recentAlbums])

  useEffect(() => {
    if (!user) { setLikes({}); return }
    const ids = recentAlbums.filter(r => r.user_id !== user.id).map(r => r.id)
    if (ids.length === 0) { setLikes({}); return }
    reviewLikesApi.getLikesForRatings(ids)
      .then(setLikes)
      .catch(() => setLikes({}))
  }, [recentAlbums, user?.id])

  const nothingToShow = topAlbums.length === 0 && recentAlbums.length === 0 && topSongs.length === 0

  return (
    <div className="page discover-page">
      <Seo title="Discover" />
      <h1 className="page-title">Discover</h1>
      <p className="page-subtitle">Find new music through what other listeners are rating.</p>

      {loading ? (
        /* Page heading is already rendered, so fill the rows with skeletons
           shaped like the real cards rather than a second full loader. */
        <div className="discover-sections">
          {['a', 'b', 'c'].map(key => (
            <div className="discover-row" key={key}>
              <p className="section-heading skeleton-heading" aria-hidden="true">
                <SkeletonBox width="140px" height="10px" radius="3px" />
              </p>
              <div className="discover-scroll">
                <SkeletonList count={6}>{i => <SkeletonDiscoverCard key={i} />}</SkeletonList>
              </div>
            </div>
          ))}
        </div>
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
              {recentAlbums.map(r => {
                const profile = profiles[r.user_id]
                // Card navigates to the album, but the reviewer name is its
                // own link to their profile — a nested <a> inside <a> would
                // be invalid HTML, so the card is a div with link semantics.
                return (
                  <div
                    key={r.id}
                    className="discover-card"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/album/${r.album_id}`)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/album/${r.album_id}`)
                      }
                    }}
                  >
                    <CardArt src={r.album_image} alt={r.album_name} />
                    <div className="discover-card-info">
                      <p className="discover-card-title" title={r.album_name}>{r.album_name}</p>
                      <p className="discover-card-artist" title={r.album_artist}>{r.album_artist}</p>
                      <div className="discover-card-reviewer">
                        <span className="inline-stars">
                          {[1, 2, 3, 4, 5].map(n => <StarGlyph key={n} value={r.rating} pos={n} />)}
                        </span>
                        {profile?.username ? (
                          <Link
                            to={`/user/${profile.username}`}
                            className="discover-card-reviewer-name"
                            onClick={e => e.stopPropagation()}
                          >
                            {reviewerLabel(profile)}
                          </Link>
                        ) : (
                          <span className="discover-card-reviewer-name">{reviewerLabel(profile)}</span>
                        )}
                      </div>
                      {user && r.user_id !== user.id && (
                        <div className="discover-card-footer">
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

          {user && recommended.length > 0 && (
            <Row heading="You may also like">
              {recommended.map(item => (
                <Link
                  key={`${item.type}:${item.id}`}
                  to={item.type === 'album' ? `/album/${item.id}` : `/track/${item.id}`}
                  className="discover-card"
                >
                  <CardArt src={item.image} alt={item.name} />
                  <div className="discover-card-info">
                    <p className="discover-card-title" title={item.name}>{item.name}</p>
                    <p className="discover-card-artist" title={item.artist}>{item.artist}</p>
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
