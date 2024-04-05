import Sentry from '@sentry/node'
import logger from '../util/logger'
import { fetchCoursesAndResponsibilities } from './courses'
import { fetchEnrolments } from './enrolments'
import { fetchUsers } from './users'
import { clearOffsets } from './util'

const runUpdater = async () => {
  await fetchUsers()
  await fetchCoursesAndResponsibilities()
  await fetchEnrolments()
}

export const run = async () => {
  logger.info('[UPDATER] Running updater')

  try {
    await clearOffsets()
    await runUpdater()
  } catch (error) {
    Sentry.captureException(error)
    Sentry.captureMessage('Updater run failed!')
    return logger.error('[UPDATER] finished with error', error)
  }

  return logger.info('[UPDATER] Finished updating')
}
