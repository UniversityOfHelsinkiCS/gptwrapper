import type { NextFunction, Request, Response } from 'express'
import { httpInFlightRequests, httpRequestDuration, httpRequestsTotal } from './index'

const normalizePathForMetrics = (path: string) => {
  const segments = path.split('/').filter((s) => s.length > 0)
  const normalized = segments.map((segment) => {
    if (/^\d+$/.test(segment)) return ':id'
    if (/^[0-9a-fA-F-]{8,}$/.test(segment)) return ':id'
    if (/^[a-zA-Z]{2,6}-[0-9a-fA-F-]{8,}$/.test(segment)) return ':id'
    return segment
  })
  return normalized.length > 0 ? `/${normalized.join('/')}` : ''
}

const getRouteLabel = (req: Request) => {
  const route = (req.route as { path?: unknown } | undefined)?.path
  const routePath = typeof route === 'string' && route.length > 0 ? route : null
  const baseUrl = typeof req.baseUrl === 'string' ? normalizePathForMetrics(req.baseUrl) : ''

  if (routePath) return `${baseUrl}${routePath}`
  if (baseUrl.length > 0) return baseUrl
  return 'unknown'
}

export const metricsRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  httpInFlightRequests.inc()

  let inFlightDone = false
  const finishInFlight = () => {
    if (inFlightDone) return
    inFlightDone = true
    httpInFlightRequests.dec()
  }

  const end = httpRequestDuration.startTimer()

  res.once('finish', () => {
    const labels = {
      method: req.method,
      route: getRouteLabel(req),
      status: String(res.statusCode),
    } as const

    httpRequestsTotal.inc(labels)
    end(labels)
    finishInFlight()
  })

  res.once('close', finishInFlight)

  next()
}
