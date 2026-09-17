import { useMusicStore } from '../stores/useMusicStore.ts'

// Leases prevent a cancelled/old result from restoring music under a newer finale.
const owners = new Set<symbol>()
export function holdBackgroundMusic(): () => void {
  const owner = Symbol('arena-finale')
  owners.add(owner)
  useMusicStore.getState().setDucked(true)
  return () => {
    if (!owners.delete(owner)) return
    if (!owners.size) useMusicStore.getState().setDucked(false)
  }
}
