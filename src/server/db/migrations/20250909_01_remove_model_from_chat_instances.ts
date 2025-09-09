import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('chat_instances', 'model')
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('chat_instances', 'model', {
    type: DataTypes.STRING,
    allowNull: true,
  })
}
