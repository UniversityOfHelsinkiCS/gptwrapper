import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('prompts', 'model', {
    type: DataTypes.STRING,
    allowNull: true,
  })

  await queryInterface.addColumn('prompts', 'temperature', {
    type: DataTypes.FLOAT,
    allowNull: true,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('prompts', 'model')
  await queryInterface.removeColumn('prompts', 'temperature')
}
