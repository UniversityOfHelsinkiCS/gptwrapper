import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('services', 'prompt')

  await queryInterface.addColumn('services', 'prompt', {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    allowNull: false,
    defaultValue: [],
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('services', 'prompt', {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    allowNull: false,
    defaultValue: [],
  })
}
