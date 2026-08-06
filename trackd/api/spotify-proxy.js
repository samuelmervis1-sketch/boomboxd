export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const spotifyPath = url.pathname.replace('/api/spotify/', '');
  const spotifyUrl = new URL(`https://api.spotify.com/v1/${spotifyPath}`);
  url.searchParams.forEach((value, key) => spotifyUrl.searchParams.set(key, value));
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
  try {
    const response = await fetch(spotifyUrl.toString(), {
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch from Spotify' });
  }
}
