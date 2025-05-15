import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = ({ context: queryInterface }) =>
  queryInterface.createTable('discussions', {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    course_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
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

export const down: Migration = ({ context: queryInterface }) => queryInterface.dropTable('discussions')
