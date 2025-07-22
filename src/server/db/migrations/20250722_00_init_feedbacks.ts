import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('feedbacks', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    response_wanted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: '{}',
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
}

export const down: Migration = async ({ context: queryInterface }) => {}
