import Sentry from '@sentry/node'

import logger from '../util/logger'

const errorHandler = (error: any, _req: any, _res: any, next: any) => {
  logger.error(`${error.message} ${error.name} ${error.stack}`)

  Sentry.captureException(error)

  return next(error)
}

export default errorHandler
