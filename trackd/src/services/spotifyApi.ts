const TOKEN_URL = '/api/spotify-token'
const API_BASE = '/api/spotify'

interface TokenCache {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

// The client-credentials exchange happens entirely server-side in
// api/spotify-token.js — it holds the Spotify client secret via
// process.env, which Vite never inlines into the browser bundle. This
// request carries no credentials at all.
async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const res = await fetch(TOKEN_URL, { method: 'POST' })

  if (!res.ok) throw new Error(`Spotify token error: ${res.status}`)

  const data = await res.json()
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  }
  return tokenCache.token
}

async function request<T>(path: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken()
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Spotify API error ${res.status}: ${path}`)
  return res.json()
}

export interface SpotifyAlbum {
  id: string
  name: string
  artists: { id: string; name: string }[]
  images: { url: string; height: number; width: number }[]
  release_date: string
  total_tracks: number
  external_urls: { spotify: string }
}

export interface SpotifyTrack {
  id: string
  name: string
  track_number: number
  duration_ms: number
  preview_url: string | null
  artists: { id: string; name: string }[]
  // Present on full track objects (search results, GET /tracks/:id) but not
  // on the simplified tracks returned by GET /albums/:id/tracks.
  album?: SpotifyAlbum
  popularity?: number
  external_urls?: { spotify: string }
}

export interface SpotifySearchResult {
  albums: {
    items: SpotifyAlbum[]
    total: number
    next: string | null
  }
}

export interface SpotifyTrackSearchResult {
  tracks: {
    items: SpotifyTrack[]
    total: number
    next: string | null
  }
}

export const spotifyApi = {
  // Spotify Development Mode caps limit at 10
  async search(query: string, limit = 10, offset = 0): Promise<SpotifySearchResult> {
    return request<SpotifySearchResult>('/search', {
      q: query,
      type: 'album',
      limit: String(Math.min(limit, 10)),
      offset: String(offset),
    })
  },

  // Spotify Development Mode caps limit at 10
  async searchTracks(query: string, limit = 10, offset = 0): Promise<SpotifyTrackSearchResult> {
    return request<SpotifyTrackSearchResult>('/search', {
      q: query,
      type: 'track',
      limit: String(Math.min(limit, 10)),
      offset: String(offset),
    })
  },

  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    return request<SpotifyAlbum>(`/albums/${albumId}`)
  },

  async getAlbumTracks(albumId: string, limit = 50): Promise<{ items: SpotifyTrack[] }> {
    return request<{ items: SpotifyTrack[] }>(`/albums/${albumId}/tracks`, {
      limit: String(limit),
    })
  },

  async getTrack(trackId: string): Promise<SpotifyTrack> {
    return request<SpotifyTrack>(`/tracks/${trackId}`)
  },
}
