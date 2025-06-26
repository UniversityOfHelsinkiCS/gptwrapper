import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('chat_instances', 'activity_period', {
    type: DataTypes.JSON,
    allowNull: false,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('chat_instances', 'activity_period', {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  })
}
