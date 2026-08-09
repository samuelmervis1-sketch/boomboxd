import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { listsApi, type List } from '../lib/listsApi'
import CreateListModal from '../components/CreateListModal'
import './Lists.css'

export default function Lists() {
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setLists([]); setLoading(false); return }
    setLoading(true)
    listsApi.getMyLists()
      .then(setLists)
      .catch(() => setLists([]))
      .finally(() => setLoading(false))
  }, [user?.id])

  function handleCreated(list: List) {
    setLists(prev => [list, ...prev])
    setCreateOpen(false)
  }

  return (
    <div className="page lists-page">
      <div className="lists-header">
        <h1>Lists</h1>
        {user && (
          <button type="button" className="btn-rate" onClick={() => setCreateOpen(true)}>
            + Create list
          </button>
        )}
      </div>

      {!authChecked || (user && loading) ? (
        <div className="search-status"><div className="spinner" /></div>
      ) : !user ? (
        <p className="lists-empty-msg">
          <Link to="/profile">Sign in</Link> to create and manage your lists.
        </p>
      ) : lists.length === 0 ? (
        <div className="lists-empty-state">
          <p>You haven't made any lists yet.</p>
          <button type="button" className="btn-rate" onClick={() => setCreateOpen(true)}>
            + Create your first list
          </button>
        </div>
      ) : (
        <div className="lists-grid">
          {lists.map(list => (
            <Link key={list.id} to={`/list/${list.id}`} className="list-card">
              <p className="list-card-title">{list.title}</p>
              {list.description && <p className="list-card-desc">{list.description}</p>}
              <p className="list-card-meta">{list.is_public ? 'Public' : 'Private'}</p>
            </Link>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateListModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
