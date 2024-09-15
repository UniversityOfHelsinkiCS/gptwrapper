import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('chat_instances', 'course_activity_period', {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('chat_instances', 'course_activity_period')
}
