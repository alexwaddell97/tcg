import { useEffect, useState } from 'react'
import { getShopVariantRotation } from '@tcg/shared'
import { observeAppVisibility } from '../lib/appVisibility.ts'

/** Minute countdowns; refresh immediately after midnight or returning to the app. */
export function useShopRotation() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let timer: number | undefined
    const refresh = () => {
      const time = Date.now()
      setNow(time)
      window.clearTimeout(timer)
      if (!document.hidden) timer = window.setTimeout(refresh, 60_000 - time % 60_000)
    }
    const stopObserving = observeAppVisibility(visible => {
      window.clearTimeout(timer)
      if (visible) refresh()
    })
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      stopObserving()
    }
  }, [])
  return { ...getShopVariantRotation(now), now }
}
