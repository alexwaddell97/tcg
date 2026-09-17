import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-700.css'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import GameBoot from './components/boot/GameBoot.tsx'

// iOS paints edge to edge; controls consume the safe-area insets in CSS.
if (Capacitor.getPlatform() === 'ios') {
  document.documentElement.classList.add('native-ios')
  document.querySelector('meta[name=viewport]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
}

const AppRouter = (Capacitor.isNativePlatform() || window.electronAPI) ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter><GameBoot /></AppRouter>
  </StrictMode>,
)
