import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { listsApi, type List } from '../lib/listsApi'
import CreateListModal from './CreateListModal'
import './AddToListButton.css'

export interface AddToListItem {
  albumId: string
  albumName: string
  albumArtist: string | null
  albumImage: string | null
  trackId?: string | null
  trackName?: string | null
}

interface Props {
  item: AddToListItem
}

export default function AddToListButton({ item }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(false)
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [signInPrompt, setSignInPrompt] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function toggleOpen() {
    if (!user) { setSignInPrompt(true); return }
    setSignInPrompt(false)
    if (!open) {
      setLoading(true)
      listsApi.getMyLists()
        .then(setLists)
        .catch(() => setLists([]))
        .finally(() => setLoading(false))
    }
    setOpen(prev => !prev)
  }

  async function handleAdd(listId: string) {
    try {
      await listsApi.addItem(listId, {
        albumId: item.albumId,
        albumName: item.albumName,
        albumArtist: item.albumArtist,
        albumImage: item.albumImage,
        trackId: item.trackId,
        trackName: item.trackName,
      })
      setAddedTo(prev => new Set(prev).add(listId))
    } catch {
      // Best-effort — the item just won't show as added if this fails.
    }
  }

  function handleListCreated(list: List) {
    setLists(prev => [list, ...prev])
    setCreateOpen(false)
    handleAdd(list.id)
  }

  return (
    <div className="add-to-list-wrap" ref={wrapRef}>
      <button type="button" className="btn-rate" onClick={toggleOpen}>
        + Add to list
      </button>

      {signInPrompt && (
        <p className="sign-in-prompt">
          <Link to="/profile">Sign in</Link> to add to a list
        </p>
      )}

      {open && (
        <div className="add-to-list-dropdown">
          {loading ? (
            <p className="add-to-list-empty">Loading…</p>
          ) : lists.length === 0 ? (
            <p className="add-to-list-empty">No lists yet.</p>
          ) : (
            <div className="add-to-list-items">
              {lists.map(l => (
                <button
                  key={l.id}
                  type="button"
                  className="add-to-list-item"
                  onClick={() => handleAdd(l.id)}
                  disabled={addedTo.has(l.id)}
                >
                  <span>{l.title}</span>
                  {addedTo.has(l.id) && <span className="add-to-list-check">Added</span>}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="add-to-list-new"
            onClick={() => { setCreateOpen(true); setOpen(false) }}
          >
            + New list
          </button>
        </div>
      )}

      {createOpen && (
        <CreateListModal onClose={() => setCreateOpen(false)} onCreated={handleListCreated} />
      )}
    </div>
  )
}
