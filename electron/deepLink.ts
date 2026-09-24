import { app, ipcMain } from 'electron'
import path from 'path'
import { getMainWindow } from './window'

export const WAVEIFY_SCHEME = 'waveify'

let pendingDeepLink: string | null = null

export function queueDeepLink(url: string) {
  pendingDeepLink = url
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send('deep-link:url', url)
    pendingDeepLink = null
  }
}

export function extractDeepLinkFromArgv(argv: string[]): string | null {
  return argv.find((a) => a.startsWith('waveify://')) || null
}

// waveify://song/:id    -> #/song/:id
// waveify://playlist/:id -> #/playlist/:id
// The renderer (src/app/App.tsx handleDeepLinkUrl) accepts both the raw
// protocol URL and this hash form.
export function deepLinkToHash(url: string): string | null {
  const song = url.match(/^waveify:\/\/song\/([0-9a-fA-F-]{36})/i)
  if (song) return `#/song/${song[1]}`
  const playlist = url.match(/^waveify:\/\/playlist\/([0-9a-fA-F-]{36})/i)
  if (playlist) return `#/playlist/${playlist[1]}`
  return null
}

export function setupDeepLink() {
  ipcMain.on('deep-link:ready', () => {
    const mainWindow = getMainWindow()
    if (pendingDeepLink && mainWindow && !mainWindow.webContents.isLoading()) {
      mainWindow.webContents.send('deep-link:url', pendingDeepLink)
      pendingDeepLink = null
    }
  })

  // Single instance: deep link launches go to the running instance
  if (!app.requestSingleInstanceLock()) {
    app.quit()
  }

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(WAVEIFY_SCHEME, process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient(WAVEIFY_SCHEME)
  }

  app.on('second-instance', (_event, argv) => {
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
    const deepLink = extractDeepLinkFromArgv(argv)
    if (deepLink) queueDeepLink(deepLink)
  })

  app.on('open-url', (_event, url) => {
    if (url.startsWith(WAVEIFY_SCHEME + '://')) queueDeepLink(url)
  })
}
