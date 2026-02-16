import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('prompt_usages', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    chat_instance_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prompt_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'prompts',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    token_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
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

  await queryInterface.addIndex('prompt_usages', ['chat_instance_id'])
  await queryInterface.addIndex('prompt_usages', ['prompt_id'])
  await queryInterface.addIndex('prompt_usages', ['chat_instance_id', 'prompt_id'])
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('prompt_usages')
}
