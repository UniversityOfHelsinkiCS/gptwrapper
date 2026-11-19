import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('chat_instances', 'budget_bonus_percent', {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('chat_instances', 'budget_bonus_percent')
}
