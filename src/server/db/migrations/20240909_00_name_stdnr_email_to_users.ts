import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('users', 'last_name', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  })
  await queryInterface.addColumn('users', 'first_names', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  })
  await queryInterface.addColumn('users', 'student_number', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  })
  await queryInterface.addColumn('users', 'primary_email', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('users', 'last_name')
  await queryInterface.removeColumn('users', 'first_names')
  await queryInterface.removeColumn('users', 'student_number')
  await queryInterface.addColumn('users', 'primary_email', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  })
}
