import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('services', 'id', {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('services', 'id', {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  })
}
