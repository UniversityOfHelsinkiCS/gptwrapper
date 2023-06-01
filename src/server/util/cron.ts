import cron from 'node-cron'

import logger from './logger'
import { sequelize } from '../db/connection'

const resetUsage = async () => {
  logger.info('Resetting usage')
  await sequelize.query('UPDATE user_service_usages SET usage_count = 0')
}

const setupCron = async () => {
  logger.info('Starting cron jobs')
  cron.schedule('0 0 1 */3 *', resetUsage) // Every three months
}

export default setupCron
