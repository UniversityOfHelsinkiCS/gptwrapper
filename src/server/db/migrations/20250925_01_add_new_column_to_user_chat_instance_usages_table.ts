import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('user_chat_instance_usages', 'totalUsageCount', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('user_chat_instance_usages', 'totalUsageCount')
}
