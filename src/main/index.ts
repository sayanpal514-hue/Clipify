import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getDb, listJobs, getClips, getJob, updateClipStatus, insertJob } from './db'
import { getSettings, setSettingValue } from './settings'
import { listModels, downloadModel } from './models'
import { runPipeline } from './pipeline'
import { v4 as uuidv4 } from 'uuid'

export let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f0f0f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.clipify.app')
  optimizer.watchWindowShortcuts

  // Initialise SQLite DB
  getDb()

  ipcMain.handle('job:create', async (_, sourcePath: string) => {
    const id = uuidv4()
    const job = {
      id,
      source_path: sourcePath,
      status: 'pending' as const,
      created_at: Date.now(),
    }
    insertJob(job)
    return job
  })

  ipcMain.handle('job:start', async (_, jobId: string) => {
    if (!mainWindow) return { started: false }
    runPipeline(jobId, mainWindow).catch((err) => {
      console.error('Pipeline error:', err)
    })
    return { started: true }
  })

  ipcMain.handle('job:list', async () => listJobs())

  ipcMain.handle('job:get', async (_, jobId: string) => getJob(jobId))

  ipcMain.handle('job:clips', async (_, jobId: string) => getClips(jobId))

  ipcMain.handle('job:words', async (_, jobId: string) => {
    const { getWords } = await import('./db')
    return getWords(jobId)
  })

  ipcMain.handle('clip:approve', async (_, clipId: string) => {
    updateClipStatus(clipId, 'approved')
    return { ok: true }
  })

  ipcMain.handle('clip:reject', async (_, clipId: string) => {
    updateClipStatus(clipId, 'rejected')
    return { ok: true }
  })

  ipcMain.handle('clip:export', async (_, clipId: string) => {
    const { exportClip } = await import('./assemble')
    return exportClip(clipId)
  })

  ipcMain.handle('settings:get', async () => getSettings())

  ipcMain.handle('settings:set', async (_, key: string, value: string) => {
    setSettingValue(key, value)
    return { ok: true }
  })

  ipcMain.handle('model:list', async () => listModels())

  ipcMain.handle('model:download', async (_, modelName: string) => {
    await downloadModel(modelName, (percent) => {
      mainWindow?.webContents.send('job:progress', {
        jobId: 'model-download',
        stage: 'ingest',
        percent,
        message: `Downloading model ${percent}%`,
      })
    })
    return { ok: true }
  })

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'ts', 'm4v'] },
      ],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
