import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('prompts', 'name', {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('prompts', 'name', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  })
}
