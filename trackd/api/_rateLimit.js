// Best-effort per-IP rate limiting for the unauthenticated Spotify
// endpoints (api/spotify-token.js, api/spotify-proxy.js), so a script
// hammering them can't burn our Spotify app's client-credentials quota
// unbounded. These stay open to anonymous visitors on purpose — Home
// search, Discover, and Album/Track pages all depend on them and don't
// require sign-in — so this is the mitigation in place of an auth gate.
//
// State lives in memory on the serverless instance: it resets on cold
// start and isn't shared across concurrent instances, so this caps a
// single abusive client hitting one warm instance, not a distributed
// attacker spread across many. That's an accepted trade-off for a
// low-severity, defense-in-depth control — a real fix would need an
// external store (Vercel KV / Upstash / similar), which is out of scope
// here.

const buckets = new Map()
const WINDOW_MS = 60_000
// Sweep stale entries once the map gets large, so long-lived warm
// instances don't accumulate one bucket per IP forever.
const SWEEP_THRESHOLD = 5000

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function sweep(now, windowMs) {
  for (const [ip, bucket] of buckets) {
    if (now - bucket.windowStart >= windowMs) buckets.delete(ip)
  }
}

/**
 * Fixed-window counter per client IP. Returns true and lets the caller
 * proceed, or writes a 429 response (with Retry-After) and returns false.
 */
export function rateLimit(req, res, { limit, windowMs = WINDOW_MS } = {}) {
  const ip = clientIp(req)
  const now = Date.now()

  if (buckets.size > SWEEP_THRESHOLD) sweep(now, windowMs)

  const bucket = buckets.get(ip)
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(ip, { windowStart: now, count: 1 })
    return true
  }

  bucket.count += 1
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.windowStart + windowMs - now) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    res.status(429).json({ error: 'Too many requests' })
    return false
  }
  return true
}
