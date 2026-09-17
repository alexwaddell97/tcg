const { app, BrowserWindow, ipcMain, shell, Menu, protocol, net } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { assetPath } = require('./assets.cjs')

app.setName('Arena Eternal')
protocol.registerSchemesAsPrivileged([{ scheme: 'arena', privileges: {
  standard: true, secure: true, supportFetchAPI: true, stream: true,
} }])
const devUrl = !app.isPackaged ? process.env.ELECTRON_START_URL : undefined
const startUrl = devUrl || 'arena://game/'
let mainWindow

function isInternal(url) {
  try {
    const candidate = new URL(url)
    const start = new URL(startUrl)
    return candidate.protocol === start.protocol && candidate.host === start.host
  } catch { return false }
}
function openExternal(url) {
  try { if (['https:', 'http:'].includes(new URL(url).protocol)) void shell.openExternal(url) } catch {}
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 800, minHeight: 600,
    icon: path.join(__dirname, '../dist/icons/arena-512.png'),
    backgroundColor: '#0c1215', title: 'Arena Eternal', show: false,
    webPreferences: { autoplayPolicy: 'no-user-gesture-required', nodeIntegration: false, contextIsolation: true, sandbox: true,
      preload: path.join(__dirname, 'preload.cjs') },
  })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isInternal(url)) { event.preventDefault(); openExternal(url) }
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' } })
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  mainWindow.webContents.on('did-fail-load', (_event, code, description) => console.error('Desktop load failed:', code, description))
  void mainWindow.loadURL(startUrl)
  mainWindow.on('closed', () => { mainWindow = null })
}
ipcMain.handle('is-electron', () => true)
ipcMain.handle('get-version', () => app.getVersion())
app.whenReady().then(() => {
  protocol.handle('arena', async request => {
    try {
      const file = assetPath(path.join(__dirname, '../dist'), request.url)
      return file ? await net.fetch(pathToFileURL(file).href) : new Response('Not found', { status: 404 })
    } catch { return new Response('Not found', { status: 404 }) }
  })
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, ...(devUrl ? [{ role: 'toggleDevTools' }] : [])] },
    { role: 'windowMenu' },
  ]))
  if (process.platform === 'darwin') app.dock.setIcon(path.join(__dirname, '../dist/icons/arena-512.png'))
  createWindow()
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
