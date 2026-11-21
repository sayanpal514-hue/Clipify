import { getJob, getWords, insertClip } from './db'
import { getSettings } from './settings'
import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import type { Word, Clip } from '../../shared/types'

export async function detect(
  jobId: string,
  onProgress: (percent: number, msg: string) => void
): Promise<void> {
  const job = getJob(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)

  const words = getWords(jobId)
  if (!words.length) throw new Error('No words found — transcription step may have failed')

  onProgress(10, 'Building annotated transcript…')
  const transcriptString = buildTranscriptString(words)

  const settings = getSettings()
  if (!settings.apiKey) {
    throw new Error('No LLM API key configured. Open Settings and add your API key.')
  }

  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.apiBaseUrl || 'https://api.openai.com/v1',
  })

  onProgress(30, 'Sending transcript to LLM…')
  const clips = await callLlm(client, transcriptString, jobId, words, settings.llmModel, onProgress)

  onProgress(90, `Storing ${clips.length} detected clip(s)…`)
  for (const clip of clips) insertClip(clip)

  onProgress(100, `Detection done — ${clips.length} viral clip(s) found`)
}

function buildTranscriptString(words: Word[]): string {
  return words
    .map((w) => {
      const flags = [w.is_loud ? '[LOUD]' : '', w.after_scene_cut ? '[CUT]' : '']
        .filter(Boolean)
        .join(' ')
      return `[${w.idx}] ${w.word} (${w.start.toFixed(2)}s)${flags ? ' ' + flags : ''}`
    })
    .join('\n')
}

async function callLlm(
  client: OpenAI,
  transcriptString: string,
  jobId: string,
  words: Word[],
  model: string,
  onProgress: (p: number, msg: string) => void,
  isRetry = false
): Promise<Clip[]> {
  const systemPrompt = `You are an expert viral video editor. Select the top 5 most shareable moments.
Each clip must be 30-90 seconds, start and end at sentence boundaries, and have a
scroll-stopping hook in the first 5 words. Prefer [LOUD] and [CUT] signals.
Return ONLY valid JSON, no explanation.`

  const retryNote = isRetry
    ? '\n\nCRITICAL: Return ONLY the raw JSON object. No markdown, no code fences, no explanation.'
    : ''

  const userContent =
    `--- TRANSCRIPT ---\n${transcriptString}\n--- END ---\n` +
    `Return: {"clips": [{"start_word_index": 0, "end_word_index": 0, "score": 0, "hook": "", "reason": ""}]}` +
    retryNote

  onProgress(isRetry ? 60 : 50, isRetry ? 'Retrying LLM call with stricter JSON prompt…' : 'Waiting for LLM response…')

  let raw: string
  try {
    const response = await client.chat.completions.create({
      model: model || 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })
    raw = response.choices[0]?.message?.content ?? ''
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`LLM API call failed: ${msg}`)
  }

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\n?|```/g, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    if (!isRetry) {
      return callLlm(client, transcriptString, jobId, words, model, onProgress, true)
    }
    throw new Error('LLM returned invalid JSON even after retry. Check your model and API key.')
  }

  const rawClips: any[] = Array.isArray(parsed) ? parsed : (parsed.clips ?? [])
  const wordCount = words.length

  return rawClips
    .filter((c: any) => typeof c.start_word_index === 'number' && typeof c.end_word_index === 'number')
    .map((c: any): Clip => {
      const startIdx = Math.max(0, Math.min(c.start_word_index, wordCount - 1))
      const endIdx = Math.max(startIdx + 1, Math.min(c.end_word_index, wordCount - 1))
      return {
        id: uuidv4(),
        job_id: jobId,
        start_word_idx: startIdx,
        end_word_idx: endIdx,
        start_time: words[startIdx].start,
        end_time: words[endIdx].end,
        score: Math.min(100, Math.max(0, Math.round(c.score ?? 50))),
        hook: String(c.hook ?? '').slice(0, 200),
        reason: String(c.reason ?? '').slice(0, 500),
        output_path: '',
        status: 'pending',
      }
    })
}
