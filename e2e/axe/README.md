# axe drop-in

Copy this whole folder into a Playwright project's `e2e/` directory to get WCAG scanning
with a grouped text report and a JSON findings file.

## Setup

1. `sh e2e/axe/install_axe.sh`
2. Paste the two snippets it prints into `playwright.config.ts` and `package.json`.
3. Edit `e2e/axe/axe.config.ts` — excludes, extra rules, WCAG tags, output directory.
4. Git-ignore the output directory.
5. Write `e2e/checks/axe-scan.spec.ts` (skeleton below) and run `npm run axe:scan`.

Nothing else in the folder needs editing, so a newer version of it can be dropped in on
top as long as `axe.config.ts` is kept.

## Spec skeleton

```ts
import { expect, test } from '@playwright/test'

import { scan, writeAxeReport } from '../axe/axe_utils'

test.describe('axe wcag scan', () => {
  test.afterAll(writeAxeReport)

  test('scan home', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await scan(page, testInfo.title)
  })
})
```

Each `scan()` call soft-asserts, so one spec can walk several UI states and still report
every violation in one run.

`testInfo.title` makes the failure tell which UI state broke.

## Exports

- `scan(page, state)` — runs axe plus a strict DOM pass for interactive elements with no
  accessible name (axe skips those when it considers them hidden), records the findings
  and soft-asserts that there are none.
- `writeAxeReport()` — call from `afterAll`; writes `<outputDir>/axe-findings.json` and
  logs the whole-run report.
- `report(findings)` — the grouped-by-rule text formatter.
- `Finding` — the finding type.

## `--workers=1`

Findings accumulate in one module-level array, so the run must be single-worker for
`writeAxeReport` to see all of them. The npm script above pins that.
