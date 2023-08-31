import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('services', 'activity_period', {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('services', 'activity_period')
}
