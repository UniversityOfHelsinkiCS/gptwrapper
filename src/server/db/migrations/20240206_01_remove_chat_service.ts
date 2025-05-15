import { QueryTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  const id = 'chat'

  await queryInterface.sequelize.query('DELETE FROM user_service_usages WHERE service_id = :id;', {
    replacements: { id },
    type: QueryTypes.DELETE,
  })

  await queryInterface.sequelize.query('DELETE FROM services WHERE id = :id;', {
    replacements: { id },
    type: QueryTypes.DELETE,
  })
}

export const down: Migration = async () => {}
