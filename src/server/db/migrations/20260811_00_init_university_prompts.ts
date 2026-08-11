import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('university_prompts', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    fi: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'prompts',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    en: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'prompts',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    sv: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'prompts',
        key: 'id',
      },
      onDelete: 'SET NULL',
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

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('university_prompts')
}
