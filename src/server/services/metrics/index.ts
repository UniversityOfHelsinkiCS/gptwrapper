import client from 'prom-client'

const quantiles = [0.5, 0.9, 0.95, 0.99]

export const httpRequestsTotal = new client.Counter({
  name: 'currechat_http_requests_total',
  help: 'Total HTTP requests completed.',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [],
})

export const httpRequestDuration = new client.Histogram({
  name: 'currechat_http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [],
})

export const httpInFlightRequests = new client.Gauge({
  name: 'currechat_http_in_flight_requests',
  help: 'Number of HTTP requests currently in flight.',
  registers: [],
})

export const vlmQueueWait = new client.Histogram({
  name: 'currechat_vlm_queue_wait_seconds',
  help: 'BullMQ job wait time: processedOn - timestamp (seconds).',
  labelNames: ['queue', 'provider'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
  registers: [],
})

export const vlmProcessing = new client.Histogram({
  name: 'currechat_vlm_processing_duration_seconds',
  help: 'BullMQ job processing time: finishedOn - processedOn (seconds).',
  labelNames: ['queue', 'provider', 'status'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 240, 300, 420, 600, 1200, 1800],
  registers: [],
})

export const vlmQueueWaitPercentiles = new client.Summary({
  name: 'currechat_vlm_queue_wait_percentiles_seconds',
  help: 'Queue wait-time percentiles by queue/provider/status.',
  labelNames: ['queue', 'provider', 'status'] as const,
  percentiles: quantiles,
  maxAgeSeconds: 600,
  ageBuckets: 5,
  registers: [],
})

export const vlmProcessingPercentiles = new client.Summary({
  name: 'currechat_vlm_processing_duration_percentiles_seconds',
  help: 'Processing-time percentiles by queue/provider/status.',
  labelNames: ['queue', 'provider', 'status'] as const,
  percentiles: quantiles,
  maxAgeSeconds: 600,
  ageBuckets: 5,
  registers: [],
})

export const vlmJobsTotal = new client.Counter({
  name: 'currechat_vlm_jobs_total',
  help: 'VLM jobs total by status.',
  labelNames: ['queue', 'provider', 'status'] as const,
  registers: [],
})

export const vlmRetriesTotal = new client.Counter({
  name: 'currechat_vlm_job_retries_total',
  help: 'VLM job retries total.',
  labelNames: ['queue', 'provider'] as const,
  registers: [],
})

export const vlmStallsTotal = new client.Counter({
  name: 'currechat_vlm_job_stalls_total',
  help: 'Jobs exceeding stall threshold or BullMQ stalled event.',
  labelNames: ['queue', 'provider'] as const,
  registers: [],
})

export const queueDepth = new client.Gauge({
  name: 'currechat_vlm_queue_depth',
  help: 'BullMQ queue depth by state.',
  labelNames: ['queue', 'state'] as const,
  registers: [],
})

export const oldestJobAge = new client.Gauge({
  name: 'currechat_vlm_oldest_job_age_seconds',
  help: 'Age of oldest waiting job (seconds).',
  labelNames: ['queue'] as const,
  registers: [],
})

export const vlmActiveJobsOverdue = new client.Gauge({
  name: 'currechat_vlm_active_jobs_overdue',
  help: 'Number of active jobs with runtime exceeding stall threshold (300s).',
  labelNames: ['queue'] as const,
  registers: [],
})

export const vlmFailureModesTotal = new client.Counter({
  name: 'currechat_vlm_failure_modes_total',
  help: 'Failed jobs by classified failure mode.',
  labelNames: ['queue', 'provider', 'failure_mode'] as const,
  registers: [],
})

export const vlmDocumentCompletion = new client.Histogram({
  name: 'currechat_vlm_document_completion_seconds',
  help: 'Document-level end-to-end completion time from first page queued to last page terminal event.',
  labelNames: ['queue', 'provider', 'status', 'failure_mode', 'matched_condition'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 240, 300, 420, 600, 1200, 1800, 3600],
  registers: [],
})

export const vlmDocumentCompletionPercentiles = new client.Summary({
  name: 'currechat_vlm_document_completion_percentiles_seconds',
  help: 'Document-level completion percentiles under matched conditions.',
  labelNames: ['queue', 'provider', 'status', 'failure_mode', 'matched_condition'] as const,
  percentiles: quantiles,
  maxAgeSeconds: 3600,
  ageBuckets: 5,
  registers: [],
})
