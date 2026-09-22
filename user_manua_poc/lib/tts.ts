import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)

export interface SpeechClip {
  path: string
  durationMs: number
}

let voicePromise: Promise<string> | null = null

/** Picks a Finnish voice installed on this Mac (`say -v '?'`), falling back to the system default. */
function pickVoice(): Promise<string> {
  if (!voicePromise) {
    voicePromise = execFileAsync('say', ['-v', '?'])
      .then(({ stdout }) => {
        const fiLine = stdout.split('\n').find((line) => line.includes('fi_FI') && line.trim().startsWith('Satu'))
        const anyFiLine = stdout.split('\n').find((line) => line.includes('fi_FI'))
        const line = fiLine ?? anyFiLine
        return line ? line.trim().split(/\s+/)[0] : ''
      })
      .catch(() => '')
  }
  return voicePromise
}

/**
 * Synthesizes spoken narration for a caption via macOS's built-in `say` (TTS),
 * returning the resulting audio file and its duration. Returns null if `say`
 * or `ffprobe` (used to measure the clip) aren't available - narration is
 * best-effort, the video still works with just the on-screen captions.
 */
export async function synthesize(text: string, outDir: string, index: number): Promise<SpeechClip | null> {
  if (!text.trim()) return null

  try {
    const voice = await pickVoice()
    const clipPath = path.join(outDir, `narration-${index}.aiff`)
    const args = voice ? ['-v', voice, '-o', clipPath, text] : ['-o', clipPath, text]
    await execFileAsync('say', args)

    const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clipPath])
    const durationMs = Math.round(parseFloat(stdout.trim()) * 1000)

    return { path: clipPath, durationMs }
  } catch {
    return null
  }
}
