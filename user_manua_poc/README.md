# User manual videos (PoC)

Records short screen-capture videos of real user flows in the app, for use in
a user manual. Built on Playwright, but runs as a plain script (not through
`playwright test`) so each run has full control over pacing, an on-screen
fake cursor, on-screen captions, and spoken narration.

Assumes the app is already running locally on `http://localhost:3000`
(`npm run dev` from the repo root).

Requires `ffmpeg`/`ffprobe` (`brew install ffmpeg`) for .mp4 output and
narration; without it, you still get a silent `.webm` with captions only.
Spoken narration uses macOS's built-in `say` (a Finnish voice, since
scenario captions are in Finnish) - it's macOS-only.

## Layout

- `lib/` — the recording engine (reused by every scenario)
  - `config.ts` — base URL, viewport, pacing/typing speed, output dir
  - `cursor.ts` — draws a visible cursor dot and moves it in small steps
  - `caption.ts` — bottom caption bar (the DOM overlay; timing/narration
    wiring lives in `runner.ts`, which builds the actual `caption()` passed
    to scenarios)
  - `tts.ts` — turns caption text into a spoken audio clip via macOS `say`
  - `auth.ts` — logs in as a test teacher, seeds test data (same mechanism as
    `e2e/fixtures.ts` / `x-test-user-*` headers), and accepts the terms
    disclaimer via the API so it never has to appear on screen
  - `runner.ts` — launches a fresh browser + video recording per scenario
    file; after recording, converts the `.webm` to `.mp4` and mixes in the
    narration clips at the timestamps each caption appeared, via `ffmpeg`
- `scenarios/` — **one file per scenario, one video per file**. Each file
  default-exports a `Scenario` (`{ title, run }`) as defined in `lib/types.ts`.
- `videos/` — output `.mp4` (or `.webm` if ffmpeg isn't installed), named
  after the scenario file (gitignored)

## Running

```bash
# from the repo root, app must be running on :3000

# record every scenario in scenarios/
npm run manual:record

# record a single scenario
npm run manual:record -- alustus-testikurssi.ts
```

Each run opens a visible (non-headless) Chromium window — keep it in the
foreground and don't move the mouse yourself while it runs, since the fake
cursor and the real mouse are the same pointer.

## Writing a scenario

```ts
import type { Scenario } from '../lib/types'

const scenario: Scenario = {
  title: 'Human readable title, shown in the console log',
  run: async ({ page, caption, click, fill, pause }) => {
    await page.goto('/general')
    await caption('What is about to happen, shown as a caption in the video.')
    await click(page.getByTestId('some-button'))
    await fill(page.getByTestId('some-input'), 'text to type')
    await pause() // extra beat with no caption change, e.g. to let a modal settle
  },
}

export default scenario
```

- `caption(text, durationMs?)` sets the caption bar text, synthesizes and
  queues spoken narration for it, and waits at least as long as the narration
  takes to speak (or `durationMs`/`config.captionDelay`, whichever is longer).
- `click(locator)` / `fill(locator, text)` move the fake cursor to the element
  first, pause briefly, then act — so the interaction reads clearly on video
  instead of happening instantly.
- Keep scenarios scoped to one logical, user-visible flow (e.g. "create a
  prompt for a course"), not a whole session — that's what keeps "one file =
  one video" meaningful.
