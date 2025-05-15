import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = ({ context: queryInterface }) =>
  queryInterface.createTable('info_texts', {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    text: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
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

export const down: Migration = ({ context: queryInterface }) => queryInterface.dropTable('info_texts')
