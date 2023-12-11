import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    UPDATE services
    SET model = 'gpt-3.5-turbo'
    WHERE model = 'gpt-3.5-turbo-16k';
  `)

  await queryInterface.sequelize.query(`
    UPDATE service_access_groups
    SET model = 'gpt-3.5-turbo'
    WHERE model = 'gpt-3.5-turbo-16k';
  `)
}

export const down: Migration = async () => {}
