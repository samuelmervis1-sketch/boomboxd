import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { listsApi, type List, type ListSummary } from '../lib/listsApi'
import CreateListModal from '../components/CreateListModal'
import CoverStack from '../components/CoverStack'
import EmptyState, { ListPlusIcon } from '../components/EmptyState'
import Seo from '../components/Seo'
import { SkeletonList, SkeletonBox } from '../components/Skeleton'
import './Lists.css'

export default function Lists() {
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [lists, setLists] = useState<List[]>([])
  const [summaries, setSummaries] = useState<Record<string, ListSummary>>({})
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

  // Counts and preview covers for the cards. Kept separate from the lists
  // themselves so a slow or failed summary query still renders the page.
  useEffect(() => {
    if (lists.length === 0) { setSummaries({}); return }
    let cancelled = false
    listsApi.getListSummaries(lists.map(l => l.id))
      .then(data => { if (!cancelled) setSummaries(data) })
      .catch(() => { if (!cancelled) setSummaries({}) })
    return () => { cancelled = true }
  }, [lists])

  function handleCreated(list: List) {
    setLists(prev => [list, ...prev])
    setCreateOpen(false)
  }

  return (
    <div className="page lists-page">
      <Seo title="Lists" />
      <div className="lists-header">
        <div className="lists-header-text">
          <h1 className="page-title">Lists</h1>
          <p className="page-subtitle">
            Group songs and albums into ranked collections — best of the year, desert
            island picks, whatever you like.
          </p>
        </div>
        {user && lists.length > 0 && (
          <button type="button" className="btn-rate" onClick={() => setCreateOpen(true)}>
            + Create list
          </button>
        )}
      </div>

      {!authChecked || (user && loading) ? (
        <div className="lists-grid">
          <SkeletonList count={4}>{i => (
            <div className="list-card" key={i} aria-hidden="true">
              <SkeletonBox height="56px" width="78px" radius="var(--radius)" />
              <div className="list-card-text">
                <SkeletonBox height="15px" width="58%" radius="4px" />
                <SkeletonBox height="12px" width="88%" radius="4px" />
              </div>
              <div className="list-card-meta">
                <SkeletonBox height="10px" width="36%" radius="4px" />
              </div>
            </div>
          )}</SkeletonList>
        </div>
      ) : !user ? (
        <EmptyState
          icon={<ListPlusIcon />}
          title="Sign in to make lists"
          text="Lists let you rank your favourite songs and albums and share them with other listeners."
          to="/profile"
          actionLabel="Sign in"
        />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<ListPlusIcon />}
          title="No lists yet"
          text="Create your first list, then add songs and albums to it from any album or track page."
          onAction={() => setCreateOpen(true)}
          actionLabel="+ Create your first list"
        />
      ) : (
        <div className="lists-grid">
          {lists.map(list => {
            const summary = summaries[list.id]
            const count = summary?.count ?? 0
            return (
              <Link key={list.id} to={`/list/${list.id}`} className="list-card">
                <CoverStack images={summary?.images ?? []} />
                <div className="list-card-text">
                  <p className="list-card-title">{list.title}</p>
                  {list.description && <p className="list-card-desc">{list.description}</p>}
                </div>
                <div className="list-card-meta">
                  <span className={`list-card-badge${list.is_public ? '' : ' list-card-badge-private'}`}>
                    {list.is_public ? 'Public' : 'Private'}
                  </span>
                  <span className="list-card-count">{count} {count === 1 ? 'item' : 'items'}</span>
                  <span className="list-card-date">{format(new Date(list.created_at), 'MMM yyyy')}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {createOpen && (
        <CreateListModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
