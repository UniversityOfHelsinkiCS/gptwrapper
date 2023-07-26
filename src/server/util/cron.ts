import cron from 'node-cron'
import { Op } from 'sequelize'

import logger from './logger'
import { User, UserServiceUsage, ServiceAccessGroup } from '../db/models'

type ResetCron = {
  iamGroup: string
  resetCron: string
}

const setupCron = async () => {
  logger.info('Starting cron jobs')

  const accessGroups = (await ServiceAccessGroup.findAll({
    where: {
      resetCron: {
        [Op.not]: null,
      },
    },
    attributes: ['iamGroup', 'resetCron'],
  })) as ResetCron[]

  accessGroups.forEach(({ iamGroup, resetCron }) => {
    cron.schedule(resetCron, async () => {
      logger.info(`Resetting usage for ${iamGroup}`)

      const users = await User.findAll({
        where: {
          iamGroups: {
            [Op.contains]: [iamGroup],
          },
        },
        attributes: ['id'],
      })

      const userIds = users.map(({ id }) => id)

      await UserServiceUsage.destroy({
        where: {
          serviceId: 'chat',
          userId: {
            [Op.in]: userIds,
          },
        },
      })
    })
  })
}

export default setupCron
