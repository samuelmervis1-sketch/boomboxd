import { useState } from 'react'
import { reviewLikesApi } from '../lib/reviewLikesApi'
import './LikeButton.css'

interface LikeButtonProps {
  ratingId: string
  count: number
  liked: boolean
  onChange: (liked: boolean, count: number) => void
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.5s-6.9-4.35-9.55-8.32C.86 9.86 1.3 6.4 3.9 4.5c2.16-1.58 4.98-1.06 6.62.73L12 6.9l1.48-1.67c1.64-1.79 4.46-2.31 6.62-.73 2.6 1.9 3.04 5.36 1.45 7.68C18.9 16.15 12 20.5 12 20.5z" />
    </svg>
  )
}

export default function LikeButton({ ratingId, count, liked, onChange }: LikeButtonProps) {
  const [pending, setPending] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return

    const nextLiked = !liked
    const nextCount = count + (nextLiked ? 1 : -1)

    setPending(true)
    onChange(nextLiked, nextCount)
    try {
      if (nextLiked) await reviewLikesApi.likeReview(ratingId)
      else await reviewLikesApi.unlikeReview(ratingId)
    } catch {
      onChange(liked, count)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      className={`like-btn ${liked ? 'liked' : ''}`}
      onClick={handleClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike review' : 'Like review'}
    >
      <HeartIcon filled={liked} />
      {count > 0 && <span className="like-btn-count">{count}</span>}
    </button>
  )
}
