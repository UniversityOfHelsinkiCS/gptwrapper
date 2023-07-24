import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = ({ context: queryInterface }) =>
  queryInterface.createTable('service_access_groups', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    service_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'services', key: 'id' },
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'gpt-3.5-turbo',
    },
    usage_limit: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    reset_cron: {
      type: DataTypes.STRING,
      allowNull: true,
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

export const down: Migration = ({ context: queryInterface }) =>
  queryInterface.dropTable('service_access_groups')
