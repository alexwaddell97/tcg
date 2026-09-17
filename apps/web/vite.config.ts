import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { validateMobileServerEndpoint } from './src/lib/serverEndpoint'

export default defineConfig(({ mode }) => {
  if (mode === 'mobile') validateMobileServerEndpoint(loadEnv(mode, process.cwd(), 'VITE_').VITE_SERVER_URL)
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      host: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@tcg/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
  }
})
