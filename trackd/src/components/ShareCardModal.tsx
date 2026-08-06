import { useRef, useState, useEffect } from 'react'
import { toPng } from 'html-to-image'
import type { SpotifyAlbum } from '../services/spotifyApi'
import type { Rating } from '../lib/ratingsApi'
import './ShareCardModal.css'

// ── Fetch external image as data URL to sidestep CORS ─────

async function fetchAsDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return url
  }
}

// ── Extract dominant (non-black, non-white) color ─────────

async function getDominantColor(dataUrl: string): Promise<[number, number, number]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const size = 30
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
          if (brightness > 20 && brightness < 230) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
          }
        }
        resolve(count > 0
          ? [Math.floor(r / count), Math.floor(g / count), Math.floor(b / count)]
          : [40, 40, 40])
      } catch {
        resolve([40, 40, 40])
      }
    }
    img.onerror = () => resolve([40, 40, 40])
    img.src = dataUrl
  })
}

// ── Star glyph safe for html-to-image (inline styles only) ─

function CardStar({ value, pos }: { value: number; pos: number }) {
  const ACCENT = '#e8ff6b'
  const EMPTY = 'rgba(255,255,255,0.15)'
  const isFull = value >= pos
  const isHalf = !isFull && value >= pos - 0.5
  const base = { fontSize: 20, lineHeight: 1 as const, display: 'inline-block' as const }

  if (isFull) return <span style={{ ...base, color: ACCENT }}>★</span>

  if (isHalf) {
    return (
      <span style={{ ...base, position: 'relative' as const, width: '1em' }}>
        <span style={{ color: EMPTY }}>★</span>
        <span style={{
          position: 'absolute' as const,
          left: 0,
          top: 0,
          width: '50%',
          overflow: 'hidden',
          display: 'inline-block' as const,
          color: ACCENT,
          fontSize: 20,
          lineHeight: 1,
          whiteSpace: 'nowrap' as const,
        }}>★</span>
      </span>
    )
  }

  return <span style={{ ...base, color: EMPTY }}>★</span>
}

// ── The card itself (rendered for both display & PNG export)

interface CardProps {
  album: SpotifyAlbum
  rating: number
  review: string | null
  color: [number, number, number]
  artDataUrl: string | null
  cardRef: React.Ref<HTMLDivElement>
}

function ShareCard({ album, rating, review, color, artDataUrl, cardRef }: CardProps) {
  const [r, g, b] = color
  const artists = album.artists.map(a => a.name).join(', ')
  const truncated = review && review.length > 160 ? review.slice(0, 157) + '…' : review

  const dark = (v: number) => Math.floor(v * 0.24)
  const bgTop = `rgb(${dark(r)}, ${dark(g)}, ${dark(b)})`
  const glow = `rgba(${r}, ${g}, ${b}, 0.42)`

  return (
    <div
      ref={cardRef}
      style={{
        width: 360,
        minHeight: 504,
        background: `linear-gradient(168deg, ${bgTop} 0%, #090909 58%, #0d0d0d 100%)`,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        padding: '44px 32px 56px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        boxSizing: 'border-box' as const,
        position: 'relative' as const,
        overflow: 'hidden' as const,
      }}
    >
      {/* Colour bloom */}
      <div style={{
        position: 'absolute' as const,
        top: -30,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: `radial-gradient(ellipse, ${glow} 0%, transparent 70%)`,
        filter: 'blur(28px)',
        pointerEvents: 'none' as const,
        zIndex: 0,
      }} />

      {/* Album art */}
      {artDataUrl ? (
        <img
          src={artDataUrl}
          alt={album.name}
          style={{
            width: 180,
            height: 180,
            borderRadius: 14,
            objectFit: 'cover' as const,
            boxShadow: '0 28px 60px rgba(0,0,0,0.82)',
            position: 'relative' as const,
            zIndex: 1,
            flexShrink: 0,
            display: 'block',
          }}
        />
      ) : (
        <div style={{
          width: 180,
          height: 180,
          borderRadius: 14,
          background: '#1e1e1e',
          position: 'relative' as const,
          zIndex: 1,
          flexShrink: 0,
        }} />
      )}

      {/* Album name + artist */}
      <div style={{ marginTop: 26, textAlign: 'center' as const, zIndex: 1, width: '100%' }}>
        <p style={{
          color: '#ffffff',
          fontSize: 22,
          fontWeight: 800,
          margin: 0,
          letterSpacing: -0.5,
          lineHeight: 1.15,
          wordBreak: 'break-word' as const,
        }}>
          {album.name}
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13,
          fontWeight: 500,
          margin: '8px 0 0',
          letterSpacing: 0.2,
        }}>
          {artists}
        </p>
      </div>

      {/* Stars + numeric rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 18, zIndex: 1 }}>
        {[1, 2, 3, 4, 5].map(n => <CardStar key={n} value={rating} pos={n} />)}
        <span style={{
          color: '#e8ff6b',
          fontSize: 14,
          fontWeight: 700,
          marginLeft: 7,
          letterSpacing: 0.2,
        }}>
          {rating.toFixed(1)}
        </span>
      </div>

      {/* Divider */}
      {truncated && (
        <div style={{
          width: 38,
          height: 1,
          background: 'rgba(255,255,255,0.1)',
          marginTop: 22,
          zIndex: 1,
        }} />
      )}

      {/* Review quote */}
      {truncated && (
        <p style={{
          color: 'rgba(255,255,255,0.56)',
          fontSize: 13,
          fontStyle: 'italic' as const,
          textAlign: 'center' as const,
          lineHeight: 1.65,
          margin: '16px auto 0',
          zIndex: 1,
          maxWidth: 288,
        }}>
          "{truncated}"
        </p>
      )}

      {/* Watermark */}
      <div style={{
        position: 'absolute' as const,
        bottom: 22,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.2)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 4.5,
          textTransform: 'uppercase' as const,
        }}>
          boomboxd
        </span>
      </div>
    </div>
  )
}

// ── Modal wrapper ──────────────────────────────────────────

interface Props {
  album: SpotifyAlbum
  rating: Rating
  onClose: () => void
}

export default function ShareCardModal({ album, rating, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [artDataUrl, setArtDataUrl] = useState<string | null>(null)
  const [color, setColor] = useState<[number, number, number]>([40, 40, 40])
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const url = album.images[0]?.url
    if (!url) return
    fetchAsDataUrl(url).then(dataUrl => {
      setArtDataUrl(dataUrl)
      getDominantColor(dataUrl).then(setColor)
    })
  }, [album.images])

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 })
      const link = document.createElement('a')
      link.download = `${album.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-boomboxd.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Share card export failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard not available */ }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="share-overlay" onClick={handleOverlayClick}>
      <div className="share-modal" role="dialog" aria-modal="true" aria-label="Share rating card">
        <div className="share-modal-header">
          <p className="share-modal-title">Share your rating</p>
          <button className="share-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="share-card-wrap">
          <div className="share-card-scaler">
            <ShareCard
              album={album}
              rating={rating.rating}
              review={rating.review}
              color={color}
              artDataUrl={artDataUrl}
              cardRef={cardRef}
            />
          </div>
        </div>

        <div className="share-modal-actions">
          <button
            className="btn-share-download"
            onClick={handleDownload}
            disabled={downloading || !artDataUrl}
          >
            {downloading ? 'Exporting…' : '↓ Download PNG'}
          </button>
          <button className="btn-share-copy" onClick={handleCopyLink}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
