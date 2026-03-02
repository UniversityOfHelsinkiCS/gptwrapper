import client from 'prom-client'

export const vlmQueueWait = new client.Histogram({
  name: 'currechat_vlm_queue_wait_seconds',
  help: 'BullMQ job wait time: processedOn - timestamp (seconds).',
  labelNames: ['queue', 'provider'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
})

export const vlmProcessing = new client.Histogram({
  name: 'currechat_vlm_processing_duration_seconds',
  help: 'BullMQ job processing time: finishedOn - processedOn (seconds).',
  labelNames: ['queue', 'provider', 'status'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 240, 300, 420, 600, 1200, 1800],
})

export const vlmJobsTotal = new client.Counter({
  name: 'currechat_vlm_jobs_total',
  help: 'VLM jobs total by status.',
  labelNames: ['queue', 'provider', 'status'] as const,
})

export const vlmRetriesTotal = new client.Counter({
  name: 'currechat_vlm_job_retries_total',
  help: 'VLM job retries total.',
  labelNames: ['queue', 'provider'] as const,
})

export const vlmStallsTotal = new client.Counter({
  name: 'currechat_vlm_job_stalls_total',
  help: 'Jobs exceeding stall threshold or BullMQ stalled event.',
  labelNames: ['queue', 'provider'] as const,
})

export const queueDepth = new client.Gauge({
  name: 'currechat_vlm_queue_depth',
  help: 'BullMQ queue depth by state.',
  labelNames: ['queue', 'state'] as const,
})

export const oldestJobAge = new client.Gauge({
  name: 'currechat_vlm_oldest_job_age_seconds',
  help: 'Age of oldest waiting job (seconds).',
  labelNames: ['queue'] as const,
})
