import { app, Tray, Menu, globalShortcut, nativeImage } from 'electron'
import { getMainWindow } from './window'
import { markQuitting } from './updater'

let tray: Tray | null = null

export function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Waveify')
  const ctx = Menu.buildFromTemplate([
    { label: 'Waveify\'i Göster', click: () => { getMainWindow()?.show(); getMainWindow()?.focus() } },
    { label: 'Çal/Duraklat', click: () => getMainWindow()?.webContents.send('global:play-pause') },
    { label: 'Sonraki', click: () => getMainWindow()?.webContents.send('global:next') },
    { label: 'Önceki', click: () => getMainWindow()?.webContents.send('global:prev') },
    { type: 'separator' },
    { label: 'Çıkış', click: () => { markQuitting(); app.quit() } },
  ])
  tray.setContextMenu(ctx)
  tray.on('double-click', () => { getMainWindow()?.show(); getMainWindow()?.focus() })
}

export function registerGlobalShortcuts() {
  globalShortcut.register('MediaPlayPause', () => {
    getMainWindow()?.webContents.send('global:play-pause')
  })
  globalShortcut.register('MediaNextTrack', () => {
    getMainWindow()?.webContents.send('global:next')
  })
  globalShortcut.register('MediaPreviousTrack', () => {
    getMainWindow()?.webContents.send('global:prev')
  })
}
