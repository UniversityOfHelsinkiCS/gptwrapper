import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('chat_instances', 'activated', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })

  await queryInterface.sequelize.query(
    `UPDATE chat_instances SET activated = (usage_limit > 0)`,
  )
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('chat_instances', 'activated')
}
