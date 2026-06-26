import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('prompts', 'show_creator')
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('prompts', 'show_creator', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
}
