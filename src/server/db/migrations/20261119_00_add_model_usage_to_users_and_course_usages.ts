import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

const TABLES = ['users', 'user_chat_instance_usages']
const COLUMNS = ['weekly_model_usage', 'total_model_usage']

export const up: Migration = async ({ context: queryInterface }) => {
  for (const table of TABLES) {
    for (const column of COLUMNS) {
      await queryInterface.addColumn(table, column, {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      })
    }
  }
}

export const down: Migration = async ({ context: queryInterface }) => {
  for (const table of TABLES) {
    for (const column of COLUMNS) {
      await queryInterface.removeColumn(table, column)
    }
  }
}
