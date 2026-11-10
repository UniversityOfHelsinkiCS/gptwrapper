import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('prompts', 'tools', {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('prompts', 'tools')
}
