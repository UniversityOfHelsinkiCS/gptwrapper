import 'express-async-errors'
import express, { type Router } from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll } from 'vitest'

import errorHandler from '../middleware/error'

/**
 * Mounts one router on a real express app listening on a random port, for the lifetime of the test file.
 * The routers assume `req.user` is already populated by the user middleware, so `getUser` is called on
 * every request and its result injected directly. Call it at the top level of a test file.
 *
 * Import this module before the router under test. `express-async-errors` only wraps route handlers
 * registered after it loads, and without it a thrown error hangs the request instead of reaching `errorHandler`.
 */
export const startTestServer = (path: string, router: Router, getUser?: () => unknown) => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    if (getUser) {
      app.use((req, _res, next) => {
        ;(req as any).user = getUser()
        next()
      })
    }
    app.use(path, router)
    app.use(errorHandler)

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve())
    })
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
  })

  return {
    fetch: (url: string, init?: RequestInit) => fetch(`${baseUrl}${url}`, init),
  }
}
