import { useEffect, useState } from 'react'

// Fetch the image as a data URL first, sidestepping canvas CORS taint issues
// with cross-origin art (Spotify's CDN).
async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function sampleDominantColor(dataUrl: string): Promise<[number, number, number] | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const size = 30
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
          // Skip near-black/near-white pixels so the average leans toward
          // whatever actual color is in the artwork.
          if (brightness > 20 && brightness < 230) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
          }
        }
        resolve(count > 0
          ? [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
          : null)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

/** Extracts an approximate dominant color from an image URL. Returns null
 *  (no tint) while loading, on failure, or when no image URL is given. */
export function useDominantColor(imageUrl: string | null | undefined): [number, number, number] | null {
  const [color, setColor] = useState<[number, number, number] | null>(null)

  useEffect(() => {
    setColor(null)
    if (!imageUrl) return
    let cancelled = false
    fetchAsDataUrl(imageUrl)
      .then(sampleDominantColor)
      .then(c => { if (!cancelled) setColor(c) })
      .catch(() => { if (!cancelled) setColor(null) })
    return () => { cancelled = true }
  }, [imageUrl])

  return color
}
