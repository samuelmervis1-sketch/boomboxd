import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { followsApi, type Follow } from '../lib/followsApi'
import { profilesApi, type Profile } from '../lib/profilesApi'
import type { Rating } from '../lib/ratingsApi'
import { StarGlyph } from '../components/RatingModal'
import EmptyState, { HeadphonesIcon } from '../components/EmptyState'
import './Feed.css'

function reviewerName(profile: Profile | undefined): string {
  return profile?.username || 'a boomboxd fan'
}

export default function Feed() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [following, setFollowing] = useState<Follow[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    }).catch(() => setAuthLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setFollowing([]); setRatings([]); setLoading(false); return }

    let cancelled = false
    setLoading(true)
    Promise.all([followsApi.getFollowing(user.id), followsApi.getFeedRatings()])
      .then(([followingRows, feedRatings]) => {
        if (cancelled) return
        setFollowing(followingRows)
        setRatings(feedRatings)
      })
      .catch(() => {
        if (cancelled) return
        setFollowing([])
        setRatings([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    const reviewerIds = [...new Set(ratings.map(r => r.user_id))]
    if (reviewerIds.length === 0) { setProfiles({}); return }
    profilesApi.getProfiles(reviewerIds)
      .then(data => setProfiles(Object.fromEntries(data.map(p => [p.id, p]))))
      .catch(() => setProfiles({}))
  }, [ratings])

  const header = (
    <>
      <h1 className="page-title">Feed</h1>
      <p className="page-subtitle">Ratings and reviews from the people you follow.</p>
    </>
  )

  if (authLoading || loading) {
    return (
      <div className="feed-page">
        {header}
        <div className="feed-status"><div className="spinner" /></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="feed-page">
        {header}
        <EmptyState
          icon={<HeadphonesIcon />}
          title="Sign in to build your feed"
          text="Follow other listeners and their ratings will show up here as they post them."
          to="/profile"
          actionLabel="Sign in"
        />
      </div>
    )
  }

  if (following.length === 0) {
    return (
      <div className="feed-page">
        {header}
        <EmptyState
          icon={<HeadphonesIcon />}
          title="You're not following anyone yet"
          text="Find an album or song, open it, and follow the people whose reviews you like. Their ratings will land here."
          to="/"
          actionLabel="Find music to rate"
        />
      </div>
    )
  }

  if (ratings.length === 0) {
    return (
      <div className="feed-page">
        {header}
        <EmptyState
          icon={<HeadphonesIcon />}
          title="Nothing here just yet"
          text="Nobody you follow has rated anything so far. Check back soon, or rate something yourself to get started."
          to="/"
          actionLabel="Rate something"
        />
      </div>
    )
  }

  return (
    <div className="feed-page">
      {header}
      <div className="feed-list">
        {ratings.map(r => {
          const profile = profiles[r.user_id]
          return (
            <Link key={r.id} to={`/album/${r.album_id}`} className="feed-item">
              {r.album_image
                ? <img className="feed-item-art" src={r.album_image} alt={r.album_name} />
                : <div className="feed-item-art-placeholder" />}
              <div className="feed-item-body">
                <div className="feed-item-header">
                  <span className="feed-item-reviewer">{reviewerName(profile)}</span>
                  <span className="feed-item-date">{format(new Date(r.created_at), 'MMM d, yyyy')}</span>
                </div>
                <p className="feed-item-album">{r.album_name}</p>
                <p className="feed-item-artist">{r.album_artist}</p>
                <span className="feed-item-stars">
                  {[1, 2, 3, 4, 5].map(n => <StarGlyph key={n} value={r.rating} pos={n} />)}
                </span>
                {r.review && <p className="feed-item-review">{r.review}</p>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
