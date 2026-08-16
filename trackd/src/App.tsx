import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Discover from './pages/Discover'
import Feed from './pages/Feed'
import Lists from './pages/Lists'
import ListDetail from './pages/ListDetail'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import AlbumDetail from './pages/AlbumDetail'
import TrackDetail from './pages/TrackDetail'
import NotificationBell from './components/NotificationBell'
import './App.css'

// ── Nav icons ──────────────────────────────────────────────

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function CompassIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg {...iconProps}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function Nav() {
  const [user, setUser] = useState<User | null>(null)
  // Frost the bar only once content scrolls under it, so a hero meets a flat
  // nav at rest. Passive listener, purely visual.
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <Link to="/" className="nav-logo">boomboxd</Link>
      <div className="nav-links">
        <NavLink to="/" end>
          <HomeIcon /><span className="nav-label">Home</span>
        </NavLink>
        <NavLink to="/discover">
          <CompassIcon /><span className="nav-label">Discover</span>
        </NavLink>
        <NavLink to="/feed">
          <ActivityIcon /><span className="nav-label">Feed</span>
        </NavLink>
        <NavLink to="/lists">
          <ListIcon /><span className="nav-label">Lists</span>
        </NavLink>
        <NotificationBell />
        {user ? (
          <NavLink to="/profile">
            <UserIcon /><span className="nav-label">Profile</span>
          </NavLink>
        ) : (
          <Link to="/profile" className="nav-sign-in-btn">
            <UserIcon /><span className="nav-label">Sign in</span>
          </Link>
        )}
      </div>
    </nav>
  )
}

// Re-keying on pathname remounts the wrapper on every navigation, which
// restarts the enter animation. Purely visual — routing is untouched.
function RoutedPages() {
  const location = useLocation()
  return (
    <main className="main">
      <div className="page-enter" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/list/:id" element={<ListDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/album/:id" element={<AlbumDetail />} />
          <Route path="/track/:id" element={<TrackDetail />} />
        </Routes>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <RoutedPages />
    </BrowserRouter>
  )
}
