import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = ({ context: queryInterface }) =>
  queryInterface.createTable('user_service_usages', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    service_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'services', key: 'id' },
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  })

export const down: Migration = ({ context: queryInterface }) => queryInterface.dropTable('user_service_usages')
