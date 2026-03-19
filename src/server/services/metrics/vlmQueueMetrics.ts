import logger from '../../util/logger'
import { vlmQueue, vlmQueueEvents } from '../jobs/vlmQueue'
import { type Job, type JobType } from 'bullmq'
import {
  oldestJobAge,
  queueDepth,
  vlmDocumentCompletion,
  vlmDocumentCompletionPercentiles,
  vlmFailureModesTotal,
  vlmJobsTotal,
  vlmProcessing,
  vlmProcessingPercentiles,
  vlmQueueWait,
  vlmQueueWaitPercentiles,
  vlmRetriesTotal,
  vlmStallsTotal,
} from './index'

let started = false

const DEFAULT_PROVIDER_LABEL = process.env.PROVIDER ?? 'ollama'

type FailureMode = 'none' | 'timeout' | 'transport' | 'worker_exception' | 'unknown'

type DocumentTrackingState = {
  queue: string
  provider: string
  firstQueuedAtMs: number
  latestFinishedAtMs: number
  terminalEvents: number
  failedEvents: number
  worstFailureMode: Exclude<FailureMode, 'none'> | 'unknown'
}

const documentTracking = new Map<number, DocumentTrackingState>()

const classifyFailureMode = (reason?: string): Exclude<FailureMode, 'none'> => {
  const text = reason?.toLowerCase() ?? ''

  if (text.includes('timeout') || text.includes('timed out') || text.includes('etimedout') || text.includes('abort')) {
    return 'timeout'
  }

  if (
    text.includes('fetch') ||
    text.includes('network') ||
    text.includes('socket') ||
    text.includes('econn') ||
    text.includes('connection') ||
    text.includes('5')
  ) {
    return 'transport'
  }

  if (text.length > 0) {
    return 'worker_exception'
  }

  return 'unknown'
}

const getProviderLabel = (job: { data: unknown }) => {
  if (job.data && typeof job.data === 'object' && 'provider' in job.data) {
    const provider = (job.data as Record<string, unknown>).provider
    if (typeof provider === 'string' && provider.length > 0) return provider
  }
  return DEFAULT_PROVIDER_LABEL
}

const getRagFileId = (job: Job) => {
  if (job.data && typeof job.data === 'object' && 'ragFileId' in job.data) {
    const ragFileId = (job.data as Record<string, unknown>).ragFileId
    if (typeof ragFileId === 'number' && Number.isFinite(ragFileId)) return ragFileId
  }
  return null
}

const hasRemainingDocumentJobs = async (ragFileId: number) => {
  const terminalPendingStates: JobType[] = ['waiting', 'active', 'delayed', 'prioritized', 'waiting-children']
  const jobs = await vlmQueue.getJobs(terminalPendingStates, 0, 5000, false)
  return jobs.some((job) => {
    if (!job.data || typeof job.data !== 'object' || !('ragFileId' in job.data)) return false
    return (job.data as Record<string, unknown>).ragFileId === ragFileId
  })
}

const trackDocumentTerminalEvent = async (job: Job, failureMode: FailureMode) => {
  const ragFileId = getRagFileId(job)
  if (ragFileId == null) return

  const queue = job.queueName ?? vlmQueue.name
  const provider = getProviderLabel(job)
  const current =
    documentTracking.get(ragFileId) ??
    ({
      queue,
      provider,
      firstQueuedAtMs: job.timestamp,
      latestFinishedAtMs: job.finishedOn ?? Date.now(),
      terminalEvents: 0,
      failedEvents: 0,
      worstFailureMode: 'unknown',
    } satisfies DocumentTrackingState)

  current.queue = queue
  current.provider = provider
  current.firstQueuedAtMs = Math.min(current.firstQueuedAtMs, job.timestamp)
  current.latestFinishedAtMs = Math.max(current.latestFinishedAtMs, job.finishedOn ?? Date.now())
  current.terminalEvents += 1

  if (failureMode !== 'none') {
    current.failedEvents += 1
    current.worstFailureMode = failureMode
  }

  documentTracking.set(ragFileId, current)

  if (await hasRemainingDocumentJobs(ragFileId)) return

  const status = current.failedEvents > 0 ? 'failed' : 'completed'
  const finalFailureMode: FailureMode = current.failedEvents > 0 ? current.worstFailureMode : 'none'
  const durationSec = Math.max((current.latestFinishedAtMs - current.firstQueuedAtMs) / 1000, 0)
  const matchedCondition = 'provider_matched'

  vlmDocumentCompletion.observe(
    {
      queue: current.queue,
      provider: current.provider,
      status,
      failure_mode: finalFailureMode,
      matched_condition: matchedCondition,
    },
    durationSec,
  )

  vlmDocumentCompletionPercentiles.observe(
    {
      queue: current.queue,
      provider: current.provider,
      status,
      failure_mode: finalFailureMode,
      matched_condition: matchedCondition,
    },
    durationSec,
  )

  documentTracking.delete(ragFileId)
}

export async function startVlmQueueMetrics() {
  if (started) return
  started = true

  vlmQueueEvents.on('error', (error) => {
    logger.error('VLM QueueEvents error', error)
  })

  setInterval(async () => {
    try {
      const counts = await vlmQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed')
      const q = vlmQueue.name

      queueDepth.set({ queue: q, state: 'waiting' }, counts.waiting ?? 0)
      queueDepth.set({ queue: q, state: 'active' }, counts.active ?? 0)
      queueDepth.set({ queue: q, state: 'delayed' }, counts.delayed ?? 0)
      queueDepth.set({ queue: q, state: 'failed' }, counts.failed ?? 0)
      queueDepth.set({ queue: q, state: 'completed' }, counts.completed ?? 0)

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
      vlmQueueWaitPercentiles.observe({ queue, provider, status }, waitSec)
    }
    if (job.processedOn != null && job.finishedOn != null) {
      const procSec = (job.finishedOn - job.processedOn) / 1000
      vlmProcessing.observe({ queue, provider, status }, procSec)
      vlmProcessingPercentiles.observe({ queue, provider, status }, procSec)
      if (procSec > 300) vlmStallsTotal.inc({ queue, provider })
    }
  }

  vlmQueueEvents.on('completed', async ({ jobId }) => {
    try {
      const job = await vlmQueue.getJob(jobId)
      if (!job) return

      observeJobTimings(job, 'success')
      vlmJobsTotal.inc({ queue: job.queueName ?? vlmQueue.name, provider: getProviderLabel(job), status: 'completed' })
      await trackDocumentTerminalEvent(job, 'none')
    } catch (error) {
      logger.error('Failed to handle VLM queue completed event', error)
    }
  })

  vlmQueueEvents.on('failed', async ({ jobId, failedReason }) => {
    try {
      const job = await vlmQueue.getJob(jobId)
      if (!job) return

      observeJobTimings(job, 'failed')
      const provider = getProviderLabel(job)
      const failureMode = classifyFailureMode(failedReason)
      vlmJobsTotal.inc({ queue: job.queueName ?? vlmQueue.name, provider, status: 'failed' })
      vlmFailureModesTotal.inc({ queue: job.queueName ?? vlmQueue.name, provider, failure_mode: failureMode })
      if (job.attemptsMade > 0) {
        vlmRetriesTotal.inc({ queue: job.queueName ?? vlmQueue.name, provider })
      }
      await trackDocumentTerminalEvent(job, failureMode)
    } catch (error) {
      logger.error('Failed to handle VLM queue failed event', error)
    }
  })

  logger.info('VLM queue metrics updater started')
}
