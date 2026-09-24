/// <reference types="vite/client" />
import { app, BrowserWindow, globalShortcut } from 'electron'
import { registerYtdlpHandlers } from './ytdlp'
import { createWindow } from './window'
import { setupDeepLink, extractDeepLinkFromArgv, queueDeepLink } from './deepLink'
import { setupUpdater } from './updater'
import { setupDiscord, initDiscordRPC, cleanupDiscord } from './discord'
import { createTray, registerGlobalShortcuts } from './tray'
import { setupAppHandlers } from './app'

setupDeepLink()
setupUpdater()
setupDiscord()
setupAppHandlers()
registerYtdlpHandlers()

app.whenReady().then(() => {
  createWindow()
  initDiscordRPC()
  createTray()
  registerGlobalShortcuts()
  const initialDeepLink = extractDeepLinkFromArgv(process.argv)
  if (initialDeepLink) queueDeepLink(initialDeepLink)
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  cleanupDiscord()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
