import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { listsApi, type List, type ListItem } from '../lib/listsApi'
import { profilesApi, type Profile } from '../lib/profilesApi'
import LoadingScreen from '../components/LoadingScreen'
import './ListDetail.css'

// ── Rank arrow ─────────────────────────────────────────────

function RankArrow({ position, previousPosition }: { position: number; previousPosition: number | null }) {
  if (previousPosition === null || previousPosition === position) {
    return <span className="rank-arrow rank-arrow-none" title="Unchanged">–</span>
  }
  if (position < previousPosition) {
    return <span className="rank-arrow rank-arrow-up" title={`Up from #${previousPosition}`}>▲</span>
  }
  return <span className="rank-arrow rank-arrow-down" title={`Down from #${previousPosition}`}>▼</span>
}

// ── Page ───────────────────────────────────────────────────

export default function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [list, setList] = useState<List | null>(null)
  const [owner, setOwner] = useState<Profile | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([listsApi.getList(id), listsApi.getListItems(id)])
      .then(([listData, itemsData]) => {
        if (!listData) { setError('List not found.'); return }
        setList(listData)
        setItems(itemsData)
      })
      .catch(() => setError('Could not load this list.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!list) { setOwner(null); return }
    profilesApi.getProfile(list.user_id).then(setOwner).catch(() => setOwner(null))
  }, [list?.user_id])

  const isOwner = !!user && !!list && user.id === list.user_id

  async function persistOrder(newItems: ListItem[]) {
    const updates = newItems.map((item, i) => ({
      id: item.id,
      position: i + 1,
      previousPosition: item.position,
    }))
    setItems(newItems.map((item, i) => ({
      ...item,
      previous_position: item.position,
      position: i + 1,
    })))
    try {
      await listsApi.reorderItems(updates)
    } catch {
      if (id) listsApi.getListItems(id).then(setItems).catch(() => {})
    }
  }

  function handleDragStart(index: number) {
    if (!isOwner) return
    setDragIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    if (!isOwner || dragIndex === null) return
    e.preventDefault()
    if (dragIndex === index) return
    setItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIndex(index)
  }

  function handleDragEnd() {
    if (!isOwner || dragIndex === null) return
    setDragIndex(null)
    persistOrder(items)
  }

  async function handleRemoveItem(item: ListItem) {
    try {
      await listsApi.removeItem(item.id)
      const remaining = items.filter(i => i.id !== item.id)
      persistOrder(remaining)
    } catch {
      // Best-effort — the row just stays put if the delete fails.
    }
  }

  async function handleDeleteList() {
    if (!list || !window.confirm('Delete this list? This cannot be undone.')) return
    setDeleting(true)
    try {
      await listsApi.deleteList(list.id)
      navigate('/lists')
    } catch {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingScreen />
  if (error || !list) return <div className="list-detail-status">{error ?? 'List not found.'}</div>

  return (
    <div className="list-detail">
      <Link to="/lists" className="back-btn list-detail-back">← Lists</Link>

      <div className="list-detail-header">
        <div>
          <h1 className="list-detail-title">{list.title}</h1>
          {list.description && <p className="list-detail-desc">{list.description}</p>}
          <p className="list-detail-meta">
            {owner && <>by <Link to={`/user/${owner.username}`} className="list-detail-owner">@{owner.username}</Link> · </>}
            {list.is_public ? 'Public' : 'Private'} · {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        {isOwner && (
          <button type="button" className="btn-delete-list" onClick={handleDeleteList} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete list'}
          </button>
        )}
      </div>

      {isOwner && items.length > 1 && (
        <p className="list-detail-hint">Drag rows to reorder.</p>
      )}

      {items.length === 0 ? (
        <p className="list-detail-empty">
          No items yet. Add albums or songs to this list from their detail pages.
        </p>
      ) : (
        <div className="ranked-list">
          {items.map((item, i) => {
            const linkTo = item.spotify_track_id
              ? `/track/${item.spotify_track_id}`
              : item.spotify_album_id
                ? `/album/${item.spotify_album_id}`
                : null
            const name = item.track_name ?? item.album_name
            const subtitle = item.track_name
              ? `${item.album_artist ?? ''}${item.album_artist ? ' · ' : ''}${item.album_name}`
              : item.album_artist ?? ''

            const row = (
              <>
                <div className="ranked-item-pos">
                  <span className="ranked-item-num">{item.position}</span>
                  <RankArrow position={item.position} previousPosition={item.previous_position} />
                </div>
                {item.album_image
                  ? <img className="ranked-item-art" src={item.album_image} alt={name} />
                  : <div className="ranked-item-art-placeholder" />}
                <div className="ranked-item-body">
                  <p className="ranked-item-name">{name}</p>
                  {subtitle && <p className="ranked-item-subtitle">{subtitle}</p>}
                </div>
              </>
            )

            return (
              <div
                key={item.id}
                className={`ranked-item${dragIndex === i ? ' dragging' : ''}${isOwner ? ' draggable' : ''}`}
                draggable={isOwner}
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
              >
                {linkTo ? (
                  <Link to={linkTo} className="ranked-item-link">{row}</Link>
                ) : (
                  <div className="ranked-item-link">{row}</div>
                )}
                {isOwner && (
                  <button
                    type="button"
                    className="ranked-item-remove"
                    onClick={() => handleRemoveItem(item)}
                    aria-label="Remove from list"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
