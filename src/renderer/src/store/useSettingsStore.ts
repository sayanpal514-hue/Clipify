import { create } from 'zustand'
import type { Settings } from '@shared/types'

interface SettingsState {
  settings: Settings | null
  loading: boolean
  load: () => Promise<void>
  save: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: false,

  load: async () => {
    set({ loading: true })
    try {
      const s = await window.clipify.settings.get()
      set({ settings: s })
    } finally {
      set({ loading: false })
    }
  },

  save: async (key, value) => {
    await window.clipify.settings.set(key, value)
    set((s) => ({
      settings: s.settings ? { ...s.settings, [key]: value } : null,
    }))
  },
}))
