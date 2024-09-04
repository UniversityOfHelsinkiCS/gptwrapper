import cron from 'node-cron'
import { Op, literal } from 'sequelize'

import logger from './logger'
import { User } from '../db/models'
import { run as runUpdater } from '../updater'
import { UPDATER_CRON_ENABLED, inDevelopment } from '../../config'

const resetUsage = async () => {
  logger.info('Resetting usage')

  await User.update(
    {
      usage: 0,
      totalUsage: literal('total_usage + CAST(usage AS BIGINT)'),
    },
    {
      where: {
        usage: {
          [Op.gt]: 0,
        },
      },
    }
  )
}

const setupCron = async () => {
  logger.info('Starting cron jobs')

  cron.schedule('0 0 1 * *', resetUsage) // Reset usage every month

  if (inDevelopment) {
    await runUpdater()
  } else if (UPDATER_CRON_ENABLED) {
    cron.schedule('15 3,15 * * *', runUpdater) // Run updater every 12 hours
  }
}

export default setupCron
