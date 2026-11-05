import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('prompts', 'published', {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('prompts', 'published')
}
