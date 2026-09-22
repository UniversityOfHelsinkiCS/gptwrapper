import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'
import { config } from './config'
import { installCursor, moveCursorTo } from './cursor'
import { installCaptions } from './caption'
import { setupTeacherSession } from './auth'
import { synthesize } from './tts'
import type { Scenario, ScenarioContext } from './types'

const execFileAsync = promisify(execFile)

/**
 * Playwright only records .webm. Convert to .mp4 with ffmpeg if it's
 * installed (`brew install ffmpeg`); otherwise keep the .webm as-is.
 */
async function convertToMp4(webmPath: string): Promise<string> {
  const mp4Path = webmPath.replace(/\.webm$/, '.mp4')
  try {
    await execFileAsync('ffmpeg', ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4Path])
    fs.rmSync(webmPath)
    return mp4Path
  } catch {
    console.warn('ffmpeg not found (or conversion failed) - keeping the .webm. Install with `brew install ffmpeg` to get .mp4 output.')
    return webmPath
  }
}

interface NarrationClip {
  path: string
  offsetMs: number
}

/** Mixes the (non-overlapping, time-offset) narration clips into a single track. */
async function buildNarrationTrack(clips: NarrationClip[], outPath: string): Promise<string | null> {
  if (clips.length === 0) return null
  try {
    const inputArgs = clips.flatMap((clip) => ['-i', clip.path])
    const delayed = clips.map((clip, i) => `[${i}:a]adelay=${clip.offsetMs}|${clip.offsetMs}[a${i}]`)
    const mixInputs = clips.map((_, i) => `[a${i}]`).join('')
    const filterComplex = `${delayed.join(';')};${mixInputs}amix=inputs=${clips.length}:duration=longest:normalize=0[aout]`
    await execFileAsync('ffmpeg', ['-y', ...inputArgs, '-filter_complex', filterComplex, '-map', '[aout]', outPath])
    return outPath
  } catch {
    console.warn('Could not build the narration audio track; the video will keep its on-screen captions only.')
    return null
  }
}

/** Muxes the narration track onto the (silent) video, keeping the video's own length. */
async function muxNarration(videoPath: string, audioPath: string): Promise<void> {
  const muxedPath = videoPath.replace(/\.mp4$/, '.narrated.mp4')
  await execFileAsync('ffmpeg', ['-y', '-i', videoPath, '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-shortest', muxedPath])
  fs.renameSync(muxedPath, videoPath)
}

async function runScenario(file: string) {
  const absPath = path.isAbsolute(file) ? file : path.resolve(config.scenariosDir, file)
  const mod = await import(pathToFileURL(absPath).href)
  const scenario: Scenario = mod.default
  if (!scenario?.run) {
    throw new Error(`${file} does not default-export a Scenario ({ title, run })`)
  }

  console.log(`\nRecording "${scenario.title}" from ${path.basename(absPath)}`)

  fs.mkdirSync(config.videoDir, { recursive: true })
  const narrationDir = fs.mkdtempSync(path.join(os.tmpdir(), 'user-manual-narration-'))

  const browser = await chromium.launch({ headless: false, slowMo: config.slowMo })
  const context = await browser.newContext({
    baseURL: config.baseURL,
    viewport: config.viewport,
    recordVideo: { dir: config.videoDir, size: config.viewport },
  })

  await setupTeacherSession(context)

  const page = await context.newPage()
  // The video's clock starts here (roughly), used to time-place narration clips.
  const recordingStart = Date.now()
  // Recorded scenarios sometimes wait on real API calls (mock model, prompt
  // save); give them more headroom than Playwright's 30s default.
  page.setDefaultTimeout(45_000)
  await installCursor(page)
  await installCaptions(page)

  const narrationClips: NarrationClip[] = []
  let narrationIndex = 0

  const caption = async (text: string, durationMsOverride?: number) => {
    const clip = await synthesize(text, narrationDir, narrationIndex++)
    const offsetMs = Date.now() - recordingStart

    await page.evaluate((t) => {
      const bar = document.getElementById('__pw_caption')
      if (!bar) return
      bar.textContent = t
      bar.style.opacity = t ? '1' : '0'
    }, text)

    if (clip) {
      narrationClips.push({ path: clip.path, offsetMs })
    }

    const waitMs = clip ? Math.max(clip.durationMs + 400, durationMsOverride ?? 0) : (durationMsOverride ?? config.captionDelay)
    await page.waitForTimeout(waitMs)
  }

  const click = async (locator: Parameters<ScenarioContext['click']>[0]) => {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    if (!box) throw new Error('Cannot click an element with no bounding box (is it visible?)')
    await moveCursorTo(page, box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(150)
    await locator.click()
    await page.waitForTimeout(config.stepDelay)
  }

  const fill = async (locator: Parameters<ScenarioContext['fill']>[0], text: string) => {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    if (!box) throw new Error('Cannot fill an element with no bounding box (is it visible?)')
    await moveCursorTo(page, box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(150)
    await locator.click()
    await locator.pressSequentially(text, { delay: config.typeDelay })
    await page.waitForTimeout(config.stepDelay)
  }

  const ctx: ScenarioContext = {
    page,
    caption,
    pause: (ms = config.stepDelay) => page.waitForTimeout(ms),
    click,
    fill,
  }

  try {
    await scenario.run(ctx)
    await ctx.pause(1500)
  } catch (err) {
    if (process.env.DEBUG_SCREENSHOT) {
      await page.screenshot({ path: process.env.DEBUG_SCREENSHOT, fullPage: true }).catch(() => {})
    }
    throw err
  } finally {
    const video = page.video()
    await context.close()
    await browser.close()

    if (video) {
      const tmpPath = await video.path()
      const outName = `${path.basename(absPath, path.extname(absPath))}.webm`
      const webmPath = path.join(config.videoDir, outName)
      fs.renameSync(tmpPath, webmPath)

      const finalPath = await convertToMp4(webmPath)

      if (finalPath.endsWith('.mp4') && narrationClips.length > 0) {
        const narrationTrack = await buildNarrationTrack(narrationClips, path.join(narrationDir, 'narration.wav'))
        if (narrationTrack) await muxNarration(finalPath, narrationTrack)
      }

      console.log(`Saved video: ${finalPath}`)
    }

    fs.rmSync(narrationDir, { recursive: true, force: true })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const files = args.length > 0 ? args : fs.readdirSync(config.scenariosDir).filter((f) => f.endsWith('.ts'))

  if (files.length === 0) {
    console.error(`No scenario files found in ${config.scenariosDir}`)
    process.exit(1)
  }

  for (const file of files) {
    await runScenario(file)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
