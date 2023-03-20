import logger from '../../util/logger'
import seedUsers from './user'
import seedServices from './service'
import createUserServiceUsages from './util'

const seed = async () => {
  // eslint-disable-next-line no-promise-executor-return
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 1_000))

  try {
    await seedUsers()
    await seedServices()

    await createUserServiceUsages()
    logger.info('Seeding successful')
  } catch (e) {
    logger.error('Seeding failed: ', e)
  }
}

export default seed
