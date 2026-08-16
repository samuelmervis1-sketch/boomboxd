import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { listsApi, type List } from '../lib/listsApi'
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
  const [creatingInline, setCreatingInline] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreatingInline(false)
      }
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
    } else {
      setCreatingInline(false)
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

  async function handleCreateInline(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newTitle.trim()
    if (!trimmed) { setCreateError('Give your list a title.'); return }

    setCreating(true)
    setCreateError(null)
    try {
      const list = await listsApi.createList({ title: trimmed, description: newDescription.trim() || null })
      setLists(prev => [list, ...prev])
      setNewTitle('')
      setNewDescription('')
      setCreatingInline(false)
      await handleAdd(list.id)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create list.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="add-to-list-wrap" ref={wrapRef}>
      <button type="button" className="btn-add-list" onClick={toggleOpen}>
        + Add to list
      </button>

      {signInPrompt && (
        <p className="sign-in-prompt">
          <Link to="/profile">Sign in</Link> to add to a list
        </p>
      )}

      {open && (
        <div className="add-to-list-dropdown">
          <button
            type="button"
            className="add-to-list-create-toggle"
            onClick={() => { setCreatingInline(prev => !prev); setCreateError(null) }}
          >
            + Create new list
          </button>

          {creatingInline && (
            <form className="add-to-list-create-form" onSubmit={handleCreateInline}>
              <input
                className="add-to-list-create-input"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="List title"
                maxLength={100}
                autoFocus
              />
              <textarea
                className="add-to-list-create-textarea"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                maxLength={500}
                rows={2}
              />
              {createError && <p className="add-to-list-create-error">{createError}</p>}
              <div className="add-to-list-create-actions">
                <button
                  type="button"
                  className="add-to-list-create-cancel"
                  onClick={() => { setCreatingInline(false); setCreateError(null) }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" className="add-to-list-create-submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="add-to-list-empty">Loading…</p>
          ) : lists.length === 0 ? (
            !creatingInline && <p className="add-to-list-empty">No lists yet.</p>
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
        </div>
      )}
    </div>
  )
}
