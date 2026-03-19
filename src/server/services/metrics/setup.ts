import express from 'express'
import client from 'prom-client'
import {
  httpInFlightRequests,
  httpRequestDuration,
  httpRequestsTotal,
  vlmQueueWait,
  vlmProcessing,
  vlmJobsTotal,
  vlmRetriesTotal,
  vlmStallsTotal,
  queueDepth,
  oldestJobAge,
  vlmActiveJobsOverdue,
  vlmQueueWaitPercentiles,
  vlmProcessingPercentiles,
  vlmFailureModesTotal,
  vlmDocumentCompletion,
  vlmDocumentCompletionPercentiles,
} from './index'
import { startVlmQueueMetrics } from './vlmQueueMetrics'
import { metricsRequestMiddleware } from './middleware'

export function setupMetrics(app: express.Express) {
  const register = new client.Registry()
  register.registerMetric(httpRequestsTotal)
  register.registerMetric(httpRequestDuration)
  register.registerMetric(httpInFlightRequests)
  register.registerMetric(vlmQueueWait)
  register.registerMetric(vlmProcessing)
  register.registerMetric(vlmQueueWaitPercentiles)
  register.registerMetric(vlmProcessingPercentiles)
  register.registerMetric(vlmJobsTotal)
  register.registerMetric(vlmRetriesTotal)
  register.registerMetric(vlmStallsTotal)
  register.registerMetric(vlmFailureModesTotal)
  register.registerMetric(queueDepth)
  register.registerMetric(oldestJobAge)
  register.registerMetric(vlmActiveJobsOverdue)
  register.registerMetric(vlmDocumentCompletion)
  register.registerMetric(vlmDocumentCompletionPercentiles)
  client.collectDefaultMetrics({ register })

  app.use(metricsRequestMiddleware)

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', register.contentType)
    res.status(200).send(await register.metrics())
  })

  void startVlmQueueMetrics()

  return { register }
}
