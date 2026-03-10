import { Queue, QueueEvents } from 'bullmq'
import IORedis, { type RedisOptions } from 'ioredis'

import { BMQ_REDIS_CA, BMQ_REDIS_CERT, BMQ_REDIS_HOST, BMQ_REDIS_KEY, BMQ_REDIS_PASS, BMQ_REDIS_PORT } from '../../util/config'

export const VLM_QUEUE_NAME = 'vlm-queue'

let creds: RedisOptions = {
  host: BMQ_REDIS_HOST,
  port: Number(BMQ_REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
}

if (BMQ_REDIS_PASS) {
  creds = {
    ...creds,
    password: BMQ_REDIS_PASS,
  }
}

if (BMQ_REDIS_CA !== 'none' && BMQ_REDIS_PASS) {
  creds = {
    ...creds,
    tls: {
      ca: BMQ_REDIS_CA,
      servername: BMQ_REDIS_HOST,
    },
  }
}

if (BMQ_REDIS_CA !== 'none' && !BMQ_REDIS_PASS) {
  creds = {
    ...creds,
    tls: {
      ca: BMQ_REDIS_CA,
      cert: BMQ_REDIS_CERT,
      key: BMQ_REDIS_KEY,
      servername: BMQ_REDIS_HOST,
    },
  }
}

const connection = new IORedis(creds)

export const vlmQueue = new Queue(VLM_QUEUE_NAME, {
  connection,
})

export const vlmQueueEvents = new QueueEvents(VLM_QUEUE_NAME, { connection })
