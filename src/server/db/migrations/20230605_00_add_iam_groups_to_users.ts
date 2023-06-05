import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('users', 'iam_groups', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('users', 'iam_groups')
}
