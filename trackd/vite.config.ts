import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/spotify-token': {
        target: 'https://accounts.spotify.com',
        changeOrigin: true,
        rewrite: () => '/api/token',
      },
      '/api/spotify': {
        target: 'https://api.spotify.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/spotify/, '/v1'),
      },
    },
  },
})
