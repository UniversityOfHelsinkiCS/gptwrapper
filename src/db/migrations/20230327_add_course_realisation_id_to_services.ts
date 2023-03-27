import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = ({ context: queryInterface }) =>
  queryInterface.addColumn('services', 'course_realisation_id', {
    type: DataTypes.STRING,
    allowNull: true,
  })

export const down: Migration = ({ context: queryInterface }) =>
  queryInterface.removeColumn('services', 'course_realisation_id')
