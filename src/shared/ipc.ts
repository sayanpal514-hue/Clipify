export const IPC = {
  JOB_CREATE: 'job:create',
  JOB_START: 'job:start',
  JOB_LIST: 'job:list',
  JOB_GET: 'job:get',
  JOB_CLIPS: 'job:clips',
  JOB_WORDS: 'job:words',
  JOB_PROGRESS: 'job:progress',
  CLIP_APPROVE: 'clip:approve',
  CLIP_REJECT: 'clip:reject',
  CLIP_EXPORT: 'clip:export',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  MODEL_DOWNLOAD: 'model:download',
  MODEL_LIST: 'model:list',
  DIALOG_OPEN_FILE: 'dialog:openFile',
  DIALOG_OPEN_FOLDER: 'dialog:openFolder',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
