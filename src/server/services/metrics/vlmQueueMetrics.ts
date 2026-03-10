import logger from '../../util/logger'
import { vlmQueue, vlmQueueEvents } from '../jobs/vlmQueue'
import { type Job } from 'bullmq'
import { oldestJobAge, queueDepth, vlmJobsTotal, vlmProcessing, vlmQueueWait, vlmRetriesTotal, vlmStallsTotal } from './index'

let started = false

const DEFAULT_PROVIDER_LABEL = process.env.PROVIDER ?? 'ollama'

const getProviderLabel = (job: { data: unknown }) => {
  if (job.data && typeof job.data === 'object' && 'provider' in job.data) {
    const provider = (job.data as Record<string, unknown>).provider
    if (typeof provider === 'string' && provider.length > 0) return provider
  }
  return DEFAULT_PROVIDER_LABEL
}

export async function startVlmQueueMetrics() {
  if (started) return
  started = true

  vlmQueueEvents.on('error', (error) => {
    logger.error('VLM QueueEvents error', error)
  })

  setInterval(async () => {
    try {
      const counts = await vlmQueue.getJobCounts('waiting', 'active', 'delayed', 'failed')
      const q = vlmQueue.name

      queueDepth.set({ queue: q, state: 'waiting' }, counts.waiting ?? 0)
      queueDepth.set({ queue: q, state: 'active' }, counts.active ?? 0)
      queueDepth.set({ queue: q, state: 'delayed' }, counts.delayed ?? 0)
      queueDepth.set({ queue: q, state: 'failed' }, counts.failed ?? 0)

      const [oldest] = await vlmQueue.getWaiting(0, 0)
      const ageSec = oldest ? (Date.now() - oldest.timestamp) / 1000 : 0
      oldestJobAge.set({ queue: q }, ageSec)
    } catch (error) {
      logger.error('Failed to update VLM queue gauges', error)
    }
  }, 15_000)

  const observeJobTimings = (job: Job, status: 'success' | 'failed') => {
    const queue = job.queueName ?? vlmQueue.name
    const provider = getProviderLabel(job)

    if (job.processedOn != null) {
      const waitSec = (job.processedOn - job.timestamp) / 1000
      vlmQueueWait.observe({ queue, provider }, waitSec)
    }
    if (job.processedOn != null && job.finishedOn != null) {
      const procSec = (job.finishedOn - job.processedOn) / 1000
      vlmProcessing.observe({ queue, provider, status }, procSec)
      if (procSec > 300) vlmStallsTotal.inc({ queue, provider })
    }
  }

  vlmQueueEvents.on('completed', async ({ jobId }) => {
    try {
      const job = await vlmQueue.getJob(jobId)
      if (!job) return

      observeJobTimings(job, 'success')
      vlmJobsTotal.inc({ queue: job.queueName ?? vlmQueue.name, provider: getProviderLabel(job), status: 'completed' })
    } catch (error) {
      logger.error('Failed to handle VLM queue completed event', error)
    }
  })

  vlmQueueEvents.on('failed', async ({ jobId }) => {
    try {
      const job = await vlmQueue.getJob(jobId)
      if (!job) return

      observeJobTimings(job, 'failed')
      const provider = getProviderLabel(job)
      vlmJobsTotal.inc({ queue: job.queueName ?? vlmQueue.name, provider, status: 'failed' })
      if (job.attemptsMade > 0) {
        vlmRetriesTotal.inc({ queue: job.queueName ?? vlmQueue.name, provider })
      }
    } catch (error) {
      logger.error('Failed to handle VLM queue failed event', error)
    }
  })

  logger.info('VLM queue metrics updater started')
}
