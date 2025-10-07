import { inProduction } from '../../../config'
import { sleep } from '../../util/util'
import logger from '../../util/logger'
import seedUsers from './user'
import seedChatInstances from './chatInstance'

const seed = async () => {
  await sleep(1_000)

  try {
    if (!inProduction) await seedUsers()
    await seedChatInstances()
    logger.info('Seeding successful')
  } catch (e) {
    logger.error('Seeding failed: ', e)
  }
}

export default seed
