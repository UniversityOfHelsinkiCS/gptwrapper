import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('services', 'course_id', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  })

  await queryInterface.addColumn('services', 'prompt', {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    allowNull: false,
    defaultValue: [],
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('services', 'course_id')
  await queryInterface.removeColumn('services', 'prompt')
}
