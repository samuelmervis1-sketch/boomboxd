import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ratingsApi, type Rating } from '../lib/ratingsApi'
import { profilesApi, type Profile } from '../lib/profilesApi'
import { StarGlyph } from '../components/RatingModal'
import AlbumArt from '../components/AlbumArt'
import LoadingScreen from '../components/LoadingScreen'
import { SkeletonList, SkeletonFeedItem } from '../components/Skeleton'
import './Profile.css'

// ── Helpers ────────────────────────────────────────────────

function getInitials(nameOrEmail: string): string {
  const name = nameOrEmail.split('@')[0]
  return name.split(/[\s._-]+/).map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(str: string): string {
  const palette = ['#e8ff6b', '#ff6b6b', '#6bffb8', '#6bb8ff', '#ff6bcd', '#ffb86b']
  let hash = 0
  for (const ch of str) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

// ── Icons ──────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ── Auth form ──────────────────────────────────────────────

type AuthMode = 'signin' | 'signup'

function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/profile' },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signin') {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const msg = error.message && error.message !== '{}'
            ? error.message
            : 'Unable to sign in. Please check your email and password.'
          setError(msg)
        }
      } catch (err: any) {
        setError(err?.message || 'Something went wrong. Please try again.')
      }
    } else {
      try {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          const msg = error.message && error.message !== '{}'
            ? error.message
            : 'Unable to create account. This email may already be registered.'
          setError(msg)
        } else {
          setMessage('Check your email for a confirmation link.')
        }
      } catch (err: any) {
        setError(err?.message || 'Something went wrong. Please try again.')
      }
    }
    setLoading(false)
  }

  function switchMode(next: AuthMode) {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="auth-logo">boomboxd</p>
        <h1 className="auth-heading">
          {mode === 'signin' ? 'Welcome back' : 'Join boomboxd'}
        </h1>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>
            Sign in
          </button>
          <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>
            Create account
          </button>
        </div>

        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="auth-divider">or</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-error" style={{ color: 'var(--accent)', background: 'rgba(232,255,107,0.06)', borderColor: 'rgba(232,255,107,0.2)' }}>{message}</p>}
          <button className="btn-submit" type="submit" disabled={loading}>
            {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Profile view ───────────────────────────────────────────

function ProfileView({ user }: { user: User }) {
  const meta = user.user_metadata as { full_name?: string; avatar_url?: string } | undefined
  const joinDate = user.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : null

  const [ratings, setRatings] = useState<Rating[]>([])
  const [ratingsLoading, setRatingsLoading] = useState(true)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setRatingsLoading(true)
    ratingsApi.getMyRatings()
      .then(data => { if (!cancelled) setRatings(data) })
      .catch(() => { if (!cancelled) setRatings([]) })
      .finally(() => { if (!cancelled) setRatingsLoading(false) })
    return () => { cancelled = true }
  }, [user.id])

  useEffect(() => {
    let cancelled = false
    profilesApi.getProfile(user.id)
      .then(p => {
        if (cancelled) return
        setProfile(p)
        setEditUsername(p?.username ?? '')
        setEditDisplayName(p?.display_name ?? '')
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user.id])

  const displayName = profile?.display_name || profile?.username || meta?.full_name || user.email || 'Music fan'
  const avatarUrl = profile?.avatar_url ?? meta?.avatar_url
  const initials = getInitials(displayName)
  const avatarColor = getAvatarColor(user.id)

  function openEdit() {
    setEditUsername(profile?.username ?? '')
    setEditDisplayName(profile?.display_name ?? '')
    setProfileError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setProfileError(null)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const username = editUsername.trim()
    if (!username) { setProfileError('Username is required.'); return }

    setSavingProfile(true)
    setProfileError(null)
    try {
      const updated = await profilesApi.updateMyProfile({
        username,
        displayName: editDisplayName.trim() || null,
      })
      setProfile(updated)
      setEditing(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.'
      setProfileError(msg.includes('duplicate key') ? 'That username is already taken.' : msg)
    } finally {
      setSavingProfile(false)
    }
  }

  const totalAlbums = ratings.length
  const totalReviews = ratings.filter(r => r.review && r.review.trim().length > 0).length
  const avgRatingLabel = totalAlbums > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalAlbums).toFixed(1)
    : '–'

  const recentRatings = ratings.slice(0, 5)

  const favoriteAlbums = [...ratings]
    .sort((a, b) => b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        {avatarUrl
          ? <img className="profile-avatar" src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" />
          : (
            <div
              className="profile-avatar-initials"
              style={{ background: avatarColor }}
            >
              {initials}
            </div>
          )
        }

        <div className="profile-identity">
          {editing ? (
            <form className="profile-edit-form" onSubmit={handleSaveProfile}>
              <div className="form-field">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  maxLength={30}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Display name</label>
                <input
                  className="form-input"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  maxLength={60}
                  placeholder="Optional"
                />
              </div>
              {profileError && <p className="auth-error">{profileError}</p>}
              <div className="profile-edit-actions">
                <button type="button" className="btn-cancel-edit" onClick={cancelEdit} disabled={savingProfile}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={savingProfile}>
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="profile-name">{displayName}</h1>
              {profile?.username && <p className="profile-email">@{profile.username}</p>}
              {joinDate && <p className="profile-joined">Member since {joinDate}</p>}
            </>
          )}
        </div>

        {!editing && (
          <div className="profile-header-actions">
            <button className="btn-edit-profile" onClick={openEdit}>Edit profile</button>
            <button className="btn-signout" onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="stat-value">{totalAlbums}</span>
          <span className="stat-label">Albums</span>
        </div>
        <div className="profile-stat">
          <span className="stat-value">{totalReviews}</span>
          <span className="stat-label">Reviews</span>
        </div>
        <div className="profile-stat">
          <span className="stat-value">{avgRatingLabel}</span>
          <span className="stat-label">Avg Rating</span>
        </div>
      </div>

      {/* Favorite albums */}
      <div className="profile-section">
        <p className="profile-section-heading">Favorite Albums</p>
        <div className="favorites-shelf">
          {Array.from({ length: 4 }).map((_, i) => {
            const fav = favoriteAlbums[i]
            if (!fav) {
              return (
                <div key={i} className="favorites-slot" title="Rate more albums to fill this spot">
                  <PlusIcon />
                </div>
              )
            }
            return (
              <Link
                key={fav.id}
                to={`/album/${fav.album_id}`}
                className="favorites-album"
                title={`${fav.album_name} — ${fav.rating} stars`}
              >
                <AlbumArt src={fav.album_image} alt={fav.album_name} placeholderClassName="favorites-album-placeholder" />
                <span className="favorites-album-rating">{fav.rating}★</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="profile-section">
        <p className="profile-section-heading">Recent Activity</p>
        {ratingsLoading ? (
          <div className="activity-list">
            <SkeletonList count={4}>{i => <SkeletonFeedItem key={i} />}</SkeletonList>
          </div>
        ) : recentRatings.length === 0 ? (
          <div className="activity-empty">
            <div className="activity-empty-icon">🎵</div>
            <p>No activity yet. Log an album to get started.</p>
            <Link to="/" className="activity-empty-link">Search albums →</Link>
          </div>
        ) : (
          <div className="activity-list">
            {recentRatings.map(r => (
              <Link key={r.id} to={`/album/${r.album_id}`} className="activity-item">
                <AlbumArt src={r.album_image} alt={r.album_name} className="activity-art" placeholderClassName="activity-art-placeholder" />
                <div className="activity-body">
                  <p className="activity-album-name">{r.album_name}</p>
                  <p className="activity-album-artist">{r.album_artist}</p>
                  <span className="activity-stars">
                    {[1, 2, 3, 4, 5].map(n => <StarGlyph key={n} value={r.rating} pos={n} />)}
                  </span>
                  {r.review && <p className="activity-review">{r.review}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <LoadingScreen />

  return user ? <ProfileView user={user} /> : <AuthForm />
}
