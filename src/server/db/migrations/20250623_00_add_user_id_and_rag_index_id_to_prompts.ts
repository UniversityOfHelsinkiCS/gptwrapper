import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('prompts', 'type', {
    type: DataTypes.ENUM('CHAT_INSTANCE', 'PERSONAL', 'RAG_INDEX'),
    defaultValue: 'CHAT_INSTANCE',
  })

  await queryInterface.changeColumn('prompts', 'chat_instance_id', {
    type: DataTypes.STRING,
    allowNull: true,
  })

  await queryInterface.addColumn('prompts', 'user_id', {
    type: DataTypes.STRING,
    allowNull: true,
  })

  await queryInterface.addColumn('prompts', 'rag_index_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('prompts', 'type')

  await queryInterface.changeColumn('prompts', 'chat_instance_id', {
    type: DataTypes.STRING,
    allowNull: false,
  })

  await queryInterface.removeColumn('prompts', 'user_id')

  await queryInterface.removeColumn('prompts', 'rag_index_id')
}
