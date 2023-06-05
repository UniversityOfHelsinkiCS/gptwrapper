import cron from 'node-cron'
import { Op } from 'sequelize'

import { globalCampusIam } from './config'
import logger from './logger'
import { User, UserServiceUsage } from '../db/models'

const resetUsage = async () => {
  logger.info('Resetting all usage')

  await UserServiceUsage.destroy({
    where: {
      serviceId: 'chat',
    },
  })
}

const resetGlobalCampusUsage = async () => {
  logger.info('Resetting global campus usage')

  const glocalCampusUsers = await User.findAll({
    where: {
      iamGroups: {
        [Op.contains]: [globalCampusIam],
      },
    },
    attributes: ['id'],
  })

  const userIds = glocalCampusUsers.map((user) => user.id)

  await UserServiceUsage.destroy({
    where: {
      serviceId: 'chat',
      userId: {
        [Op.in]: userIds,
      },
    },
  })
}

const setupCron = async () => {
  logger.info('Starting cron jobs')

  cron.schedule('0 0 1 */3 *', resetUsage) // Every three months
  cron.schedule('0 0 1 * *', resetGlobalCampusUsage) // Once a month
}

export default setupCron
