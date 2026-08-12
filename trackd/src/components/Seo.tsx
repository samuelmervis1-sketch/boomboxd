import { Helmet } from 'react-helmet-async'

export const DEFAULT_TITLE = 'boomboxd'
export const DEFAULT_DESCRIPTION = 'Rate songs and albums. Share your taste.'
export const DEFAULT_IMAGE = '/icon-512.png'

function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`
}

interface Props {
  /** Page-specific title. Rendered as "<title> — boomboxd". Omit to use the bare default title. */
  title?: string
  description?: string
  /** Absolute or root-relative image URL. Falls back to the boomboxd logo. */
  image?: string | null
  type?: 'website' | 'music.album' | 'music.song' | 'profile'
}

export default function Seo({ title, description, image, type = 'website' }: Props) {
  const fullTitle = title ? `${title} — boomboxd` : DEFAULT_TITLE
  const desc = description || DEFAULT_DESCRIPTION
  const img = absoluteUrl(image || DEFAULT_IMAGE)
  const url = typeof window !== 'undefined' ? window.location.href : undefined

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="boomboxd" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      {url && <meta property="og:url" content={url} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  )
}
