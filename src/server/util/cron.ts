import cron from 'node-cron'
import { Op } from 'sequelize'

import logger from './logger'
import { User } from '../db/models'

const resetUsage = async () => {
  logger.info('Resetting usage')

  await User.update(
    { usage: 0 },
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
}

export default setupCron
