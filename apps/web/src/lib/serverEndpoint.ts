/** Native builds without a backend remain usable for local practice. */
export function resolveServerEndpoint(configured: string | undefined, native: boolean): string | undefined {
  const value = configured?.trim()
  if (value) return value
  return native ? undefined : 'http://localhost:3001'
}

export function validateMobileServerEndpoint(value: string | undefined): void {
  if (!value?.trim()) return
  const url = new URL(value.trim())
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Mobile VITE_SERVER_URL must be an HTTPS server URL without credentials, query or hash.')
  }
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Mobile VITE_SERVER_URL must be reachable from the device, not localhost.')
  }
}
