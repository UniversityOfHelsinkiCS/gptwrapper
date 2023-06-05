import cron from 'node-cron'
import { Op, QueryTypes } from 'sequelize'

import logger from './logger'
import { sequelize } from '../db/connection'
import { User } from '../db/models'

const resetUsage = async () => {
  logger.info('Resetting usage')

  await sequelize.query('UPDATE user_service_usages SET usage_count = 0', {
    type: QueryTypes.UPDATE,
  })
}

const resetGlobalCampusUsage = async () => {
  logger.info('Resetting global campus usage')

  const glocalCampusUsers = await User.findAll({
    where: {
      iamGroups: {
        [Op.contains]: ['grp-curregc'],
      },
    },
    attributes: ['id'],
  })

  const userIds = glocalCampusUsers.map((user) => user.id)

  await sequelize.query(
    'UPDATE user_service_usages SET usage_count = 0 WHERE user_id IN (:userIds)',
    {
      replacements: { userIds },
      type: QueryTypes.UPDATE,
    }
  )
}

const setupCron = async () => {
  logger.info('Starting cron jobs')

  cron.schedule('0 0 1 */3 *', resetUsage) // Every three months
  cron.schedule('0 0 1 * *', resetGlobalCampusUsage) // Once a month
}

export default setupCron
