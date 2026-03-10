import express from 'express'
import client from 'prom-client'
import { vlmQueueWait, vlmProcessing, vlmJobsTotal, vlmRetriesTotal, vlmStallsTotal, queueDepth, oldestJobAge } from './index'
import { startVlmQueueMetrics } from './vlmQueueMetrics'

export function setupMetrics(app: express.Express) {
  const register = new client.Registry()
  register.registerMetric(vlmQueueWait)
  register.registerMetric(vlmProcessing)
  register.registerMetric(vlmJobsTotal)
  register.registerMetric(vlmRetriesTotal)
  register.registerMetric(vlmStallsTotal)
  register.registerMetric(queueDepth)
  register.registerMetric(oldestJobAge)
  client.collectDefaultMetrics({ register })

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', register.contentType)
    res.status(200).send(await register.metrics())
  })

  void startVlmQueueMetrics()

  return { register }
}
