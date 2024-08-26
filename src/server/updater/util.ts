/* eslint-disable no-restricted-syntax */
import * as Sentry from '@sentry/node'

import { redis } from '../util/redis'
import logger from '../util/logger'
import { PartialRecord } from '../types'

const logError = (message: string, error: Error) => {
  logger.error(`${message} ${error.name}, ${error.message}`)

  Sentry.captureException(error)
}

type AllowedBulkCreateOptionField =
  | 'conflictAttributes'
  | 'updateOnDuplicate'
  | 'ignoreDuplicates'
type AllowedFallbackCreateOptionField =
  | 'fields'
  | 'conflictFields'

interface BulkCreateOptions {
  entityName: string
  bulkCreate: (entities: object[], options: any) => Promise<any>
  fallbackCreate: (entity: object, options: any) => Promise<any>
  bulkCreateOptions: PartialRecord<AllowedBulkCreateOptionField, any>
  fallbackCreateOptions: PartialRecord<AllowedFallbackCreateOptionField, any>
  entities: Record<string, any>[]
}
export const safeBulkCreate = async ({
  entityName,
  bulkCreate,
  fallbackCreate,
  bulkCreateOptions,
  fallbackCreateOptions,
  entities,
}: BulkCreateOptions) => {
  try {
    const result = await bulkCreate(entities, {
      ...bulkCreateOptions,
    })
    return result
  } catch (bulkCreateError: any) {
    const result = []
    logError(
      `[UPDATER] ${entityName}.bulkCreate failed, reason: `,
      bulkCreateError
    )
    logger.info(`[UPDATER] Creating ${entityName}s one by one`)
    for (const entity of entities) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fallbackCreate(entity, {
          ...fallbackCreateOptions,
        })
        result.push(res)
      } catch (fallbackCreateError: any) {
        logError(
          `[UPDATER] Fallback could not create ${entityName} (${JSON.stringify(
            entity
          )}), reason:`,
          fallbackCreateError
        )
      }
    }
    return result
  }
}

export const logOperation = async (func: Function, message: string) => {
  const start = Date.now()
  let success = false
  let info = null
  try {
    info = await func()
    success = true
  } catch (error) {
    Sentry.captureMessage(`Operation failed: ${message}`)
    Sentry.captureException(error)
    logger.error('Error: ', error)
  }

  const durationMs = (Date.now() - start).toFixed()
  if (success) {
    logger.info(`${message} - done in ${durationMs} ms`, info)
  } else {
    logger.error(`Failure: ${message} - failed in ${durationMs} ms`, info)
  }
}

export const clearOffsets = async () => {
  const keys = await redis.keys('*-offset')

  for (const key of keys) {
    // eslint-disable-next-line no-await-in-loop
    await redis.del(key)
  }
}
