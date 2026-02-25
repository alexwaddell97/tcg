export const config = {
  port: Number(process.env.PORT) || 3001,
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? [
    'http://localhost:5173',
    'http://localhost:4173',
  ],
}
