import { useState } from 'react'
import { followsApi } from '../lib/followsApi'
import './FollowButton.css'

interface FollowButtonProps {
  targetUserId: string
  isFollowing: boolean
  signedIn: boolean
  onChange: (following: boolean) => void
  onRequireSignIn: () => void
}

export default function FollowButton({
  targetUserId,
  isFollowing,
  signedIn,
  onChange,
  onRequireSignIn,
}: FollowButtonProps) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (!signedIn) { onRequireSignIn(); return }
    if (pending) return

    setPending(true)
    try {
      if (isFollowing) {
        await followsApi.unfollowUser(targetUserId)
        onChange(false)
      } else {
        await followsApi.followUser(targetUserId)
        onChange(true)
      }
    } catch {
      // Leave state unchanged on failure; user can retry.
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      className={`follow-btn ${isFollowing ? 'following' : ''}`}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? '…' : isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
