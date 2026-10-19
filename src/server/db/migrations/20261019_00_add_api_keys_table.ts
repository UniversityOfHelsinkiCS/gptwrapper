import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('api_keys', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    api_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  })
  await queryInterface.addIndex('api_keys', ['api_key'], { unique: true })
  await queryInterface.addIndex('api_keys', ['user_id'])
}

export const down: Migration = ({ context: queryInterface }) => queryInterface.dropTable('api_keys')
