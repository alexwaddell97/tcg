const path = require('node:path')

function assetPath(root, requestUrl) {
  const url = new URL(requestUrl)
  if (url.protocol !== 'arena:' || url.hostname !== 'game') return null
  const pathname = decodeURIComponent(url.pathname)
  if (pathname.includes('\\') || pathname.includes('\0')) return null
  const target = path.resolve(root, `.${pathname}`)
  const relative = path.relative(root, target)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null
  return path.extname(target) ? target : path.join(root, 'index.html')
}
module.exports = { assetPath }
