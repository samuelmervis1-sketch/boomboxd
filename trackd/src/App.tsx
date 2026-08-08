import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Home from './pages/Home'
import Discover from './pages/Discover'
import Feed from './pages/Feed'
import Lists from './pages/Lists'
import Profile from './pages/Profile'
import AlbumDetail from './pages/AlbumDetail'
import './App.css'

function Nav() {
  return (
    <nav className="nav">
      <span className="nav-logo">boomboxd</span>
      <div className="nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/discover">Discover</NavLink>
        <NavLink to="/feed">Feed</NavLink>
        <NavLink to="/lists">Lists</NavLink>
        <NavLink to="/profile">Profile</NavLink>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/album/:id" element={<AlbumDetail />} />
        </Routes>
      </main>
      <Analytics />
    </BrowserRouter>
  )
}
