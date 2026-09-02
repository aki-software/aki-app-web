import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')
const allowedHosts = (env.VITE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: allowedHosts.length > 0 ? allowedHosts : undefined,
  },
})
