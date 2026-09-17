import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { App } from '@capacitor/app'

/** Web visibility plus native app lifecycle; neither may resume a hidden app. */
export function observeAppVisibility(onChange: (visible: boolean) => void): () => void {
  let nativeActive = true
  let disposed = false
  let listener: PluginListenerHandle | undefined
  const update = () => { if (!disposed) onChange(nativeActive && !document.hidden) }
  const hide = () => onChange(false)
  document.addEventListener('visibilitychange', update)
  window.addEventListener('pageshow', update)
  window.addEventListener('pagehide', hide)
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => {
      nativeActive = isActive
      update()
    }).then(handle => {
      if (disposed) void handle.remove()
      else listener = handle
    }).catch(error => console.warn('Native app visibility unavailable', error))
  }
  update()
  return () => {
    disposed = true
    document.removeEventListener('visibilitychange', update)
    window.removeEventListener('pageshow', update)
    window.removeEventListener('pagehide', hide)
    void listener?.remove()
  }
}
