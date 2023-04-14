import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('services', 'usage_limit', {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })

  await queryInterface.changeColumn('user_service_usages', 'usage_count', {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('services', 'usage_limit', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })

  await queryInterface.changeColumn('user_service_usages', 'usage_count', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
}
