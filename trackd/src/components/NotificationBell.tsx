import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNowStrict } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { notificationsApi, type Notification } from '../lib/notificationsApi'
import './NotificationBell.css'

const POLL_INTERVAL_MS = 30_000

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function BellIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

function notificationText(n: Notification): string {
  const who = n.actor ? `@${n.actor.username}` : 'Someone'
  if (n.type === 'follow') return `${who} followed you`
  return `${who} liked your review of ${n.rating?.album_name ?? 'an album'}`
}

function notificationLink(n: Notification): string {
  if (n.type === 'follow') return n.actor ? `/user/${n.actor.username}` : '/'
  return n.rating ? `/album/${n.rating.album_id}` : '/'
}

export default function NotificationBell() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const refreshUnreadCount = useCallback(() => {
    notificationsApi.getUnreadCount().then(setUnreadCount).catch(() => {})
  }, [])

  // Poll unread count while signed in
  useEffect(() => {
    if (!user) { setUnreadCount(0); setNotifications([]); setOpen(false); return }
    refreshUnreadCount()
    const id = setInterval(refreshUnreadCount, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [user?.id, refreshUnreadCount])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggleOpen() {
    setOpen(prev => {
      const next = !prev
      if (next) {
        setLoading(true)
        notificationsApi.getNotifications(20)
          .then(setNotifications)
          .catch(() => setNotifications([]))
          .finally(() => setLoading(false))
      }
      return next
    })
  }

  function handleItemClick(n: Notification) {
    setOpen(false)
    if (n.read) return
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    setUnreadCount(c => Math.max(0, c - 1))
    notificationsApi.markAsRead(n.id).catch(() => {})
  }

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    notificationsApi.markAllAsRead().catch(() => {})
  }

  if (!user) return null

  return (
    <div className="notif-bell-container" ref={containerRef}>
      <button
        type="button"
        className={`notif-bell-btn${unreadCount > 0 ? ' has-unread' : ''}`}
        onClick={toggleOpen}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  to={notificationLink(n)}
                  className={`notif-item ${n.read ? 'read' : 'unread'}`}
                  onClick={() => handleItemClick(n)}
                >
                  <p className="notif-item-text">{notificationText(n)}</p>
                  <span className="notif-item-time">
                    {formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
