import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'popup.html'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      port: 5173
    }
  },
  publicDir: 'public'
})