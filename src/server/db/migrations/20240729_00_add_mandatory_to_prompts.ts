import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('prompts', 'mandatory', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('prompts', 'mandatory')
}
