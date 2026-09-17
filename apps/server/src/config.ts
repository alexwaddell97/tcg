export const config = {
  port: Number(process.env.PORT) || 3001,
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? [
    'http://localhost:5173',
    'http://localhost:4173',
    'capacitor://localhost', // Bundled iOS app
    'arena://game', // Bundled Electron app
    'http://localhost:5174', // Electron development server
    'https://localhost', // Bundled Android app
  ],
}
