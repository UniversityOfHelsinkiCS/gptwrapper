import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('chat_instances', 'course_units', {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    allowNull: false,
    defaultValue: [],
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('chat_instances', 'course_units')
}
