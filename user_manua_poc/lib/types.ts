import type { Locator, Page } from '@playwright/test'
import type { CaptionFn } from './caption'

export interface ScenarioContext {
  page: Page
  /** Show a caption line in the video and wait while it is on screen. */
  caption: CaptionFn
  /** Wait without a caption change, e.g. to let a UI transition settle. */
  pause: (ms?: number) => Promise<void>
  /** Move the fake cursor to the element and click it, slowly enough to follow. */
  click: (locator: Locator) => Promise<void>
  /** Move the fake cursor to the field, focus it, and type the text character by character. */
  fill: (locator: Locator, text: string) => Promise<void>
}

export interface Scenario {
  /** Shown in the console log while recording; also used to derive the output file name. */
  title: string
  run: (ctx: ScenarioContext) => Promise<void>
}
