import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'
import { ChatInstance, Prompt, PromptChatInstance } from '../models'

export const up: Migration = async ({ context: queryInterface }) => {
  const transaction = await queryInterface.sequelize.transaction()

  await queryInterface.createTable('prompts_chat_instances', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    chat_instance_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prompt_id: {
      type: DataTypes.STRING,
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

  const prompts = await Prompt.findAll({ transaction })

  for (const prompt of prompts) {
    if (!prompt.chatInstanceId) continue

    const chatInstance = await ChatInstance.findByPk(
      prompt.chatInstanceId,
      { transaction },
    )

    if (!chatInstance) continue

    await PromptChatInstance.create(
      {
        promptId: prompt.id,
        chatInstanceId: chatInstance.id,
      },
      { transaction },
    )
  }

  await transaction.commit()
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('prompts_chat_instances')
}
