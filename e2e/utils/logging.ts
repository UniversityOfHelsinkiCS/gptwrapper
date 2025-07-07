import type { Page } from '@playwright/test'

export async function setupLogging(page: Page) {
  page.on('requestfailed', (request) => {
    console.log('Request failed: ' + request.url() + ' ' + request.failure()?.errorText)
  })

  page.on('request', (request) => {
    console.log('Request: ' + request.url())
  })

  page.on('response', (response) => {
    console.log('Request finished: ' + response.url() + ' ' + response.status())
  })

  page.on('console', (msg) => {
    console.log(`Console message: ${msg.text()}`)
  })

  page.on('crash', () => {
    console.log('Page crashed')
  })

  page.on('pageerror', (error) => {
    console.log('Page error: ' + error.message)
  })
}
