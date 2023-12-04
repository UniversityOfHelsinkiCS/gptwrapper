import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('prompts', 'system_message', {
    type: DataTypes.TEXT,
    allowNull: false,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('prompts', 'system_message', {
    type: DataTypes.STRING,
    allowNull: false,
  })
}
