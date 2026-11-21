import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'

const api = {
  job: {
    create: (sourcePath: string) => ipcRenderer.invoke(IPC.JOB_CREATE, sourcePath),
    start: (jobId: string) => ipcRenderer.invoke(IPC.JOB_START, jobId),
    list: () => ipcRenderer.invoke(IPC.JOB_LIST),
    get: (jobId: string) => ipcRenderer.invoke(IPC.JOB_GET, jobId),
    clips: (jobId: string) => ipcRenderer.invoke(IPC.JOB_CLIPS, jobId),
    words: (jobId: string) => ipcRenderer.invoke(IPC.JOB_WORDS, jobId),
  },
  clip: {
    approve: (clipId: string) => ipcRenderer.invoke(IPC.CLIP_APPROVE, clipId),
    reject: (clipId: string) => ipcRenderer.invoke(IPC.CLIP_REJECT, clipId),
    export: (clipId: string) => ipcRenderer.invoke(IPC.CLIP_EXPORT, clipId),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (key: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  },
  model: {
    list: () => ipcRenderer.invoke(IPC.MODEL_LIST),
    download: (name: string) => ipcRenderer.invoke(IPC.MODEL_DOWNLOAD, name),
  },
  dialog: {
    openFile: () => ipcRenderer.invoke(IPC.DIALOG_OPEN_FILE),
    openFolder: () => ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER),
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
    return () => ipcRenderer.removeAllListeners(channel)
  },
  off: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

contextBridge.exposeInMainWorld('clipify', api)
