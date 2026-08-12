import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('university_prompts')

  await queryInterface.createTable('university_prompts', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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

  await queryInterface.addColumn('prompts', 'university_prompt_id', {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'university_prompts',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })

  await queryInterface.addColumn('prompts', 'language', {
    type: DataTypes.STRING,
    allowNull: true,
  })

  await queryInterface.addIndex('prompts', ['university_prompt_id'])
  await queryInterface.addIndex('prompts', ['university_prompt_id', 'language'], {
    unique: true,
    name: 'prompts_university_prompt_id_language_unique',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeIndex('prompts', 'prompts_university_prompt_id_language_unique')
  await queryInterface.removeIndex('prompts', ['university_prompt_id'])

  await queryInterface.removeColumn('prompts', 'language')
  await queryInterface.removeColumn('prompts', 'university_prompt_id')

  await queryInterface.dropTable('university_prompts')

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
