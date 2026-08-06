const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET as string
const TOKEN_URL = '/api/spotify-token'
const API_BASE = '/api/spotify'

interface TokenCache {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

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
}

export interface SpotifySearchResult {
  albums: {
    items: SpotifyAlbum[]
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

  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    return request<SpotifyAlbum>(`/albums/${albumId}`)
  },

  async getAlbumTracks(albumId: string, limit = 50): Promise<{ items: SpotifyTrack[] }> {
    return request<{ items: SpotifyTrack[] }>(`/albums/${albumId}/tracks`, {
      limit: String(limit),
    })
  },
}
