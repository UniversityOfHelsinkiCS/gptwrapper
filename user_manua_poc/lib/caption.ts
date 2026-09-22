import type { Page } from '@playwright/test'
import { config } from './config'

/**
 * A fixed caption bar at the bottom of the viewport. Scenario files call the
 * function returned by makeCaption() to narrate what is about to happen.
 *
 * Passed as a raw script string, for the same reason as lib/cursor.ts: a
 * function reference here would be serialized via its compiled source text,
 * which can reference helpers (e.g. esbuild's `__name`) that don't exist in
 * the browser.
 */
const CAPTION_INIT_SCRIPT = `
(function () {
  var CAPTION_ID = '__pw_caption'

  function attach() {
    if (document.getElementById(CAPTION_ID)) return
    var bar = document.createElement('div')
    bar.id = CAPTION_ID
    Object.assign(bar.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      padding: '16px 28px',
      background: 'rgba(17, 17, 22, 0.88)',
      color: '#ffffff',
      fontSize: '21px',
      lineHeight: '1.4',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      textAlign: 'center',
      opacity: '0',
      transition: 'opacity 220ms ease',
      pointerEvents: 'none',
      zIndex: '2147483647',
    })
    document.documentElement.appendChild(bar)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach)
  } else {
    attach()
  }
})()
`

export async function installCaptions(page: Page) {
  await page.addInitScript({ content: CAPTION_INIT_SCRIPT })
}

export type CaptionFn = (text: string, durationMs?: number) => Promise<void>

export function makeCaption(page: Page): CaptionFn {
  return async (text, durationMs = config.captionDelay) => {
    await page.evaluate((t) => {
      const bar = document.getElementById('__pw_caption')
      if (!bar) return
      bar.textContent = t
      bar.style.opacity = t ? '1' : '0'
    }, text)
    await page.waitForTimeout(durationMs)
  }
}

export async function clearCaption(page: Page) {
  await page.evaluate(() => {
    const bar = document.getElementById('__pw_caption')
    if (bar) bar.style.opacity = '0'
  })
}
