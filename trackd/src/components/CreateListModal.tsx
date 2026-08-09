import { useState } from 'react'
import { listsApi, type List } from '../lib/listsApi'
import './CreateListModal.css'

interface Props {
  onClose: () => void
  onCreated: (list: List) => void
}

export default function CreateListModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) { setError('Give your list a title.'); return }

    setSaving(true)
    setError(null)
    try {
      const list = await listsApi.createList({
        title: trimmed,
        description: description.trim() || null,
        isPublic,
      })
      onCreated(list)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create list.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Create list">
        <div className="modal-header">
          <div className="modal-album-info">
            <p className="modal-album-name">Create a list</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                placeholder="e.g. Best albums of 2025"
                autoFocus
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Description <span>(optional)</span></label>
              <textarea
                className="review-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="What's this list about?"
              />
            </div>

            <label className="create-list-public-toggle">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
              Public — anyone can view this list
            </label>

            {error && <p className="modal-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <div className="modal-footer-right">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Creating…' : 'Create list'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
