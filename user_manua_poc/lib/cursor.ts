import type { Page } from '@playwright/test'

/**
 * Playwright drives the browser out-of-process, so the OS cursor never shows up
 * in a recorded video. This draws a fake cursor dot that follows every
 * page.mouse.move()/click() call, re-injected on every navigation.
 *
 * Passed as a raw script string (not a function reference): tsx/esbuild can
 * rewrite function bodies (e.g. adding a `__name` helper call) that only
 * exists in the compiled Node module, and Playwright ships the function to
 * the browser via its source text alone, so such a reference throws there.
 */
const CURSOR_INIT_SCRIPT = `
(function () {
  var CURSOR_ID = '__pw_cursor'

  function attach() {
    if (document.getElementById(CURSOR_ID)) return
    var cursor = document.createElement('div')
    cursor.id = CURSOR_ID
    Object.assign(cursor.style, {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '22px',
      height: '22px',
      marginLeft: '-11px',
      marginTop: '-11px',
      borderRadius: '50%',
      background: 'rgba(220, 38, 38, 0.85)',
      border: '2px solid rgba(255,255,255,0.95)',
      boxShadow: '0 0 8px rgba(0,0,0,0.45)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      transition: 'transform 80ms ease',
    })
    document.documentElement.appendChild(cursor)

    document.addEventListener('mousemove', function (e) {
      cursor.style.left = e.clientX + 'px'
      cursor.style.top = e.clientY + 'px'
    }, true)
    document.addEventListener('mousedown', function () {
      cursor.style.transform = 'scale(0.7)'
    })
    document.addEventListener('mouseup', function () {
      cursor.style.transform = 'scale(1)'
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach)
  } else {
    attach()
  }
})()
`

export async function installCursor(page: Page) {
  await page.addInitScript({ content: CURSOR_INIT_SCRIPT })
}

/**
 * Moves the (fake) cursor to (x, y) in small steps with a short wait between
 * each one, so the motion is visible instead of an instant teleport.
 */
export async function moveCursorTo(page: Page, x: number, y: number, opts: { steps?: number; durationMs?: number } = {}) {
  const { steps = 18, durationMs = 350 } = opts

  const current = await page
    .evaluate(() => {
      const cursor = document.getElementById('__pw_cursor')
      if (!cursor) return null
      const rect = cursor.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    })
    .catch(() => null)

  const from = current ?? { x, y }
  const stepDelay = Math.max(1, Math.round(durationMs / steps))

  for (let i = 1; i <= steps; i += 1) {
    const ix = from.x + (x - from.x) * (i / steps)
    const iy = from.y + (y - from.y) * (i / steps)
    await page.mouse.move(ix, iy)
    await page.waitForTimeout(stepDelay)
  }
}
