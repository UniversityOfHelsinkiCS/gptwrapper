import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('api_keys', 'name', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('api_keys', 'name')
}
