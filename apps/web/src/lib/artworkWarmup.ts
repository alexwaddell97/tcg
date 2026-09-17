/** Decoded images retained under a pixel budget, rather than warming the whole collection. */
const retained = new Map<string, HTMLImageElement>()
const pending = new Map<string, Promise<void>>()
const budget = 48 * 1024 * 1024
let bytes = 0

export function warmImage(url: string, timeout = 4000): Promise<void> {
  if (retained.has(url)) return Promise.resolve()
  const existing = pending.get(url)
  if (existing) return existing
  const job = new Promise<void>(resolve => {
    const image = new Image()
    image.decoding = 'async'
    let finished = false
    const finish = (decoded = false) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      image.onload = null; image.onerror = null
      if (decoded) {
        const size = image.naturalWidth * image.naturalHeight * 4
        if (size <= budget) {
          while (bytes + size > budget && retained.size) {
            const [key, old] = retained.entries().next().value!
            bytes -= old.naturalWidth * old.naturalHeight * 4
            retained.delete(key)
          }
          retained.set(url, image); bytes += size
        }
      } else image.src = ''
      resolve()
    }
    const timer = setTimeout(() => finish(), timeout)
    image.onload = () => { void image.decode().then(() => finish(true), () => finish()) }
    image.onerror = () => finish()
    image.src = url
  }).finally(() => pending.delete(url))
  pending.set(url, job)
  return job
}

/** Small batches yield between decodes; a deadline keeps optional work from blocking launch. */
export async function warmArtwork(
  urls: string[], onProgress: (fraction: number) => void,
  load: (url: string) => Promise<void> = warmImage,
  options = { concurrency: 3, deadlineMs: 7000 },
): Promise<void> {
  const unique = [...new Set(urls)]
  const deadline = Date.now() + options.deadlineMs
  let next = 0, completed = 0
  onProgress(unique.length ? 0 : 1)
  await Promise.all(Array.from({ length: Math.min(options.concurrency, unique.length) }, async () => {
    while (next < unique.length && Date.now() < deadline) {
      const url = unique[next++]
      try { await load(url) } catch { /* Optional artwork must not prevent launch. */ }
      onProgress(++completed / unique.length)
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }))
  onProgress(1)
}
