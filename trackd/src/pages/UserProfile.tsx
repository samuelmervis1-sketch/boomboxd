import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { profilesApi, type Profile } from '../lib/profilesApi'
import { ratingsApi, type Rating } from '../lib/ratingsApi'
import { followsApi } from '../lib/followsApi'
import { listsApi, type List } from '../lib/listsApi'
import { reviewLikesApi, type LikeInfo } from '../lib/reviewLikesApi'
import { reviewerColor, reviewerInitial } from '../lib/reviewerDisplay'
import { StarGlyph } from '../components/RatingModal'
import CoverStack from '../components/CoverStack'
import FollowButton from '../components/FollowButton'
import LikeButton from '../components/LikeButton'
import Seo from '../components/Seo'
import LoadingScreen from '../components/LoadingScreen'
import { SkeletonList, SkeletonFeedItem, SkeletonBox } from '../components/Skeleton'
import './UserProfile.css'

interface PublicList extends List {
  itemCount: number
  /** First few covers, for the stacked preview on the card. */
  images: string[]
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>()

  const [viewer, setViewer] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [ratings, setRatings] = useState<Rating[]>([])
  const [ratingsLoading, setRatingsLoading] = useState(true)
  const [likes, setLikes] = useState<Record<string, LikeInfo>>({})

  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [signInPrompt, setSignInPrompt] = useState(false)

  const [publicLists, setPublicLists] = useState<PublicList[]>([])
  const [listsLoading, setListsLoading] = useState(true)

  // Track the signed-in viewer (to know if this is "my own" public profile)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setViewer(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setViewer(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Look up the profile by username
  useEffect(() => {
    if (!username) return
    let cancelled = false
    setProfileLoading(true)
    setNotFound(false)
    profilesApi.getProfileByUsername(username)
      .then(p => {
        if (cancelled) return
        setProfile(p)
        setNotFound(!p)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setProfileLoading(false) })
    return () => { cancelled = true }
  }, [username])

  // Ratings — used for both the stats row and the recent-activity list
  useEffect(() => {
    if (!profile) { setRatings([]); return }
    let cancelled = false
    setRatingsLoading(true)
    ratingsApi.getRatingsForUser(profile.id)
      .then(data => { if (!cancelled) setRatings(data) })
      .catch(() => { if (!cancelled) setRatings([]) })
      .finally(() => { if (!cancelled) setRatingsLoading(false) })
    return () => { cancelled = true }
  }, [profile])

  // Follower / following counts + whether the viewer follows this person
  useEffect(() => {
    if (!profile) { setFollowerCount(0); setFollowingCount(0); setIsFollowing(false); return }
    let cancelled = false
    Promise.all([
      followsApi.getFollowers(profile.id),
      followsApi.getFollowing(profile.id),
      followsApi.isFollowing(profile.id),
    ])
      .then(([followers, following, following_]) => {
        if (cancelled) return
        setFollowerCount(followers.length)
        setFollowingCount(following.length)
        setIsFollowing(following_)
      })
      .catch(() => {
        if (cancelled) return
        setFollowerCount(0)
        setFollowingCount(0)
        setIsFollowing(false)
      })
    return () => { cancelled = true }
  }, [profile, viewer?.id])

  // Public lists, with an item count and preview covers per list. The
  // summaries come back in one round trip rather than a count query per
  // card, so a user with a lot of lists still loads in two requests.
  useEffect(() => {
    if (!profile) { setPublicLists([]); return }
    let cancelled = false
    setListsLoading(true)
    listsApi.getPublicLists(profile.id)
      .then(async lists => {
        const summaries = await listsApi.getListSummaries(lists.map(l => l.id))
        if (cancelled) return
        setPublicLists(lists.map(l => ({
          ...l,
          itemCount: summaries[l.id]?.count ?? 0,
          images: summaries[l.id]?.images ?? [],
        })))
      })
      .catch(() => { if (!cancelled) setPublicLists([]) })
      .finally(() => { if (!cancelled) setListsLoading(false) })
    return () => { cancelled = true }
  }, [profile])

  // Load like counts + whether I've liked each of this user's ratings
  // (skipped entirely on your own profile — you can't like your own reviews)
  useEffect(() => {
    if (!profile || !viewer || viewer.id === profile.id) { setLikes({}); return }
    const ids = ratings.slice(0, 20).map(r => r.id)
    if (ids.length === 0) { setLikes({}); return }
    reviewLikesApi.getLikesForRatings(ids)
      .then(setLikes)
      .catch(() => setLikes({}))
  }, [ratings, profile, viewer?.id])

  function handleFollowChange(following: boolean) {
    setIsFollowing(following)
    setFollowerCount(c => c + (following ? 1 : -1))
  }

  if (profileLoading) {
    return <LoadingScreen />
  }

  if (notFound || !profile) {
    return (
      <div className="user-profile-status user-profile-not-found">
        <p>No boomboxd user @{username}.</p>
        <Link to="/" className="user-profile-back-link">← Back to search</Link>
      </div>
    )
  }

  const isOwnProfile = viewer?.id === profile.id
  const displayName = profile.display_name || profile.username
  const initials = reviewerInitial(profile)
  const avatarColor = reviewerColor(profile.id)
  const joinDate = format(new Date(profile.created_at), 'MMMM yyyy')

  const totalRatings = ratings.length
  const totalReviews = ratings.filter(r => r.review && r.review.trim().length > 0).length
  const recentRatings = ratings.slice(0, 20)

  const seoDescription = `@${profile.username} · ${totalRatings} ${totalRatings === 1 ? 'rating' : 'ratings'} · ${followerCount} ${followerCount === 1 ? 'follower' : 'followers'} on boomboxd`

  return (
    <div className="user-profile-page">
      <Seo title={`${displayName} (@${profile.username})`} description={seoDescription} image={profile.avatar_url} type="profile" />

      {/* Header */}
      <div className="user-profile-header">
        {profile.avatar_url
          ? <img className="user-profile-avatar" src={profile.avatar_url} alt={displayName} referrerPolicy="no-referrer" />
          : (
            <div className="user-profile-avatar-initials" style={{ background: avatarColor }}>
              {initials}
            </div>
          )
        }

        <div className="user-profile-identity">
          <h1 className="user-profile-name">{displayName}</h1>
          <p className="user-profile-handle">@{profile.username}</p>
          {profile.bio && <p className="user-profile-bio">{profile.bio}</p>}
          <p className="user-profile-joined">Member since {joinDate}</p>
        </div>

        <div className="user-profile-header-actions">
          {isOwnProfile ? (
            <Link to="/profile" className="btn-edit-profile">Edit profile</Link>
          ) : (
            <FollowButton
              targetUserId={profile.id}
              isFollowing={isFollowing}
              signedIn={!!viewer}
              onChange={handleFollowChange}
              onRequireSignIn={() => setSignInPrompt(true)}
            />
          )}
        </div>
      </div>

      {signInPrompt && !isOwnProfile && (
        <p className="sign-in-prompt">
          <Link to="/profile">Sign in</Link> to follow @{profile.username}
        </p>
      )}

      {/* Stats */}
      <div className="user-profile-stats">
        <div className="user-profile-stat">
          <span className="stat-value">{totalRatings}</span>
          <span className="stat-label">Ratings</span>
        </div>
        <div className="user-profile-stat">
          <span className="stat-value">{totalReviews}</span>
          <span className="stat-label">Reviews</span>
        </div>
        <div className="user-profile-stat">
          <span className="stat-value">{followerCount}</span>
          <span className="stat-label">Followers</span>
        </div>
        <div className="user-profile-stat">
          <span className="stat-value">{followingCount}</span>
          <span className="stat-label">Following</span>
        </div>
      </div>

      {/* Recent ratings */}
      <div className="user-profile-section">
        <p className="section-heading">Recent Ratings</p>
        {ratingsLoading ? (
          <div className="user-rating-list">
            <SkeletonList count={4}>{i => <SkeletonFeedItem key={i} />}</SkeletonList>
          </div>
        ) : recentRatings.length === 0 ? (
          <p className="user-profile-empty-text">
            {isOwnProfile ? "You haven't rated anything yet." : `@${profile.username} hasn't rated anything yet.`}
          </p>
        ) : (
          <div className="user-rating-list">
            {recentRatings.map(r => {
              const isTrack = !!r.spotify_track_id
              const href = isTrack ? `/track/${r.spotify_track_id}` : `/album/${r.album_id}`
              const title = isTrack ? r.track_name : r.album_name
              const subtitle = isTrack ? r.album_name : r.album_artist
              return (
                <div key={r.id} className="user-rating-item">
                  <Link to={href} className="user-rating-item-link">
                    {r.album_image
                      ? <img className="user-rating-art" src={r.album_image} alt={title ?? ''} />
                      : <div className="user-rating-art-placeholder" />}
                    <div className="user-rating-body">
                      <p className="user-rating-title">{title}</p>
                      <p className="user-rating-subtitle">{subtitle}</p>
                      <span className="user-rating-stars">
                        {[1, 2, 3, 4, 5].map(n => <StarGlyph key={n} value={r.rating} pos={n} />)}
                      </span>
                      {r.review && <p className="user-rating-review">{r.review}</p>}
                    </div>
                  </Link>
                  {viewer && !isOwnProfile && (
                    <div className="user-rating-item-actions">
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
              )
            })}
          </div>
        )}
      </div>

      {/* Public lists */}
      <div className="user-profile-section">
        <p className="section-heading">
          {isOwnProfile ? 'Your Public Lists' : `${displayName}'s Public Lists`}
        </p>
        {listsLoading ? (
          <div className="user-list-grid">
            <SkeletonList count={2}>{i => (
              <div className="user-list-card" key={i} aria-hidden="true">
                <SkeletonBox height="56px" width="78px" radius="var(--radius)" />
                <div className="user-list-card-text">
                  <SkeletonBox height="15px" width="62%" radius="4px" />
                  <SkeletonBox height="12px" width="86%" radius="4px" />
                </div>
                <div className="user-list-card-meta">
                  <SkeletonBox height="10px" width="40%" radius="4px" />
                </div>
              </div>
            )}</SkeletonList>
          </div>
        ) : publicLists.length === 0 ? (
          <p className="user-profile-empty-text">
            {isOwnProfile ? "You don't have any public lists yet." : `@${profile.username} doesn't have any public lists yet.`}
          </p>
        ) : (
          <div className="user-list-grid">
            {publicLists.map(list => (
              <Link key={list.id} to={`/list/${list.id}`} className="user-list-card">
                <CoverStack images={list.images} />
                <div className="user-list-card-text">
                  <p className="user-list-card-title">{list.title}</p>
                  {list.description && <p className="user-list-card-desc">{list.description}</p>}
                </div>
                <div className="user-list-card-meta">
                  <span className="user-list-card-count">
                    {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="user-list-card-date">
                    {format(new Date(list.created_at), 'MMM yyyy')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
