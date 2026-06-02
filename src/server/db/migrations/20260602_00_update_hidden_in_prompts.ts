import { DataTypes } from 'sequelize'
import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  queryInterface.changeColumn('prompts', 'hidden', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  queryInterface.changeColumn('prompts', 'hidden', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
}