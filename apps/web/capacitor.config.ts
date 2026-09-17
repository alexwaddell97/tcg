import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.arenaeternal.game',
  appName: 'Arena Eternal',
  webDir: 'dist',
  backgroundColor: '#0c1215',
  plugins: { SystemBars: { insetsHandling: 'native' } },
  // Ship bundled assets; never depend on a development web server at launch.
  server: { androidScheme: 'https' },
}

export default config
