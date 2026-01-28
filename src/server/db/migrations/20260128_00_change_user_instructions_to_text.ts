import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('prompts', 'user_instructions', {
    type: DataTypes.TEXT,
    allowNull: true,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('prompts', 'user_instructions', {
    type: DataTypes.STRING,
    allowNull: true,
  })
}
