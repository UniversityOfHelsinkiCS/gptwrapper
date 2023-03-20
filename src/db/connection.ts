import { Sequelize } from 'sequelize'
import { Umzug, SequelizeStorage } from 'umzug'

import logger from '../util/logger.js'
import { DB_CONNECTION_STRING } from '../util/config.js'

const DB_CONNECTION_RETRY_LIMIT = 10

export const sequelize = new Sequelize(DB_CONNECTION_STRING, { logging: false })

const runMigrations = async () => {
  const migrator = new Umzug({
    migrations: { glob: 'src/server/db/migrations/*.cjs' },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  })

  const migrations = await migrator.up()

  logger.info('Migrations up to date', {
    migrations,
  })
}

const testConnection = async () => {
  await sequelize.authenticate()
  await runMigrations()
}

// eslint-disable-next-line no-promise-executor-return
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const connectToDatabase = async (attempt = 0): Promise<void | null> => {
  try {
    await testConnection()
  } catch (err: any) {
    if (attempt === DB_CONNECTION_RETRY_LIMIT) {
      logger.error(`Connection to database failed after ${attempt} attempts`, {
        error: err.stack,
      })

      return process.exit(1)
    }
    logger.info(
      `Connection to database failed! Attempt ${attempt} of ${DB_CONNECTION_RETRY_LIMIT}`
    )
    logger.error('Database error: ', err)
    await sleep(5000)

    return connectToDatabase(attempt + 1)
  }

  return null
}
