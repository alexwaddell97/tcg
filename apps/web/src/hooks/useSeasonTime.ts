import { useEffect, useState } from 'react'
import { ARENA_SEASONS } from '@tcg/shared'

/** Refresh an open shop at a season boundary, and after resuming the app. */
export function useSeasonTime() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const next = Math.min(...ARENA_SEASONS.flatMap(season => [season.startsAt, season.endsAt]).filter(time => time > now))
    const timer = Number.isFinite(next) ? window.setTimeout(refresh, Math.min(next - now, 2_147_483_647)) : undefined
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [now])
  return now
}
