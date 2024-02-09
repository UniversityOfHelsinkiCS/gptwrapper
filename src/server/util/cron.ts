import cron from 'node-cron'
import { Op } from 'sequelize'

import logger from './logger'
import { User } from '../db/models'

const resetUsage = async () => {
  logger.info('Resetting usage')

  const usersWithUsage = await User.findAll({
    where: {
      usage: {
        [Op.gt]: 0,
      },
    },
    attributes: ['id', 'usage', 'totalUsage'],
  })

  usersWithUsage.forEach(async (user) => {
    const { usage, totalUsage } = user

    await user.update({
      usage: 0,
      totalUsage: totalUsage + BigInt(usage),
    })
  })
}

const setupCron = async () => {
  logger.info('Starting cron jobs')

  cron.schedule('0 0 1 * *', resetUsage) // Reset usage every month
}

export default setupCron
