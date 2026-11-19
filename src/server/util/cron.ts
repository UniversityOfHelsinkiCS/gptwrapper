import cron from 'node-cron'
import { Op, literal } from 'sequelize'

import logger from './logger'
import { User, UserChatInstanceUsage } from '../db/models'
import { run as runUpdater } from '../updater'
import { inDevelopment } from '../../config'
import { UPDATER_CRON_ENABLED } from './config'

export const resetUsage = async () => {
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
    },
  )

  // Reset course chat token usage
  await UserChatInstanceUsage.update(
    {
      usageCount: 0,
    },
    {
      where: {
        usageCount: {
          [Op.gt]: 0,
        },
      },
    },
  )

  // Weekly usage by model; the totals keep it.
  const notEmpty = literal(`weekly_model_usage <> '{}'::jsonb`)
  await User.update({ weeklyModelUsage: {} }, { where: notEmpty })
  await UserChatInstanceUsage.update({ weeklyModelUsage: {} }, { where: notEmpty })

  logger.info('Usage reset complete')
}

const setupCron = async () => {
  logger.info('Starting cron jobs')

  cron.schedule('1 0 * * 1', resetUsage) // Reset usage every Monday 00:01

  if (inDevelopment) {
    await runUpdater()
  } else if (UPDATER_CRON_ENABLED) {
    cron.schedule('0 3 * * *', runUpdater) // Run updater at 3 am every day
  }
}

export default setupCron
