import { create } from 'zustand'
import type { Job, Clip, Word, ProgressEvent } from '@shared/types'

interface JobState {
  jobs: Job[]
  activeJobId: string | null
  clips: Record<string, Clip[]>
  words: Record<string, Word[]>
  progress: Record<string, ProgressEvent>
  setJobs: (jobs: Job[]) => void
  setActiveJob: (id: string | null) => void
  setClips: (jobId: string, clips: Clip[]) => void
  setWords: (jobId: string, words: Word[]) => void
  setProgress: (evt: ProgressEvent) => void
  updateClipStatus: (clipId: string, status: Clip['status']) => void
  refreshJobs: () => Promise<void>
  refreshClips: (jobId: string) => Promise<void>
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  activeJobId: null,
  clips: {},
  words: {},
  progress: {},

  setJobs: (jobs) => set({ jobs }),
  setActiveJob: (id) => set({ activeJobId: id }),
  setClips: (jobId, clips) =>
    set((s) => ({ clips: { ...s.clips, [jobId]: clips } })),
  setWords: (jobId, words) =>
    set((s) => ({ words: { ...s.words, [jobId]: words } })),
  setProgress: (evt) =>
    set((s) => ({ progress: { ...s.progress, [evt.jobId]: evt } })),
  updateClipStatus: (clipId, status) =>
    set((s) => {
      const clips = { ...s.clips }
      for (const jobId of Object.keys(clips)) {
        clips[jobId] = clips[jobId].map((c) =>
          c.id === clipId ? { ...c, status } : c
        )
      }
      return { clips }
    }),

  refreshJobs: async () => {
    const jobs = await window.clipify.job.list()
    set({ jobs })
  },

  refreshClips: async (jobId: string) => {
    const clips = await window.clipify.job.clips(jobId)
    set((s) => ({ clips: { ...s.clips, [jobId]: clips } }))
  },
}))
