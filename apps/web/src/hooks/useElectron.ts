export function useElectron() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI
  return { isElectron }
}
