import { DataTypes, QueryTypes } from 'sequelize'

import { Migration } from '../connection'
import { ChatInstance, ChatInstanceRagIndex } from '../models'

export const up: Migration = async ({ context: queryInterface }) => {
  const transaction = await queryInterface.sequelize.transaction()

  await queryInterface.createTable('chat_instances_rag_indices', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    chat_instance_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rag_index_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
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

  // Create ChatInstanceRagIndices from old relations
  const ragIndices = (await queryInterface.sequelize.query(
    `
    select * from rag_indices
    `,
    { type: QueryTypes.SELECT },
  )) as any[]

  for await (const ragIndex of ragIndices) {
    if (!ragIndex.chat_instance_id) continue

    const chatInstance = await ChatInstance.findByPk(ragIndex.chat_instance_id)

    await ChatInstanceRagIndex.create({
      ragIndexId: ragIndex.id,
      chatInstanceId: chatInstance.id,
    })
  }

  await queryInterface.removeColumn('rag_indices', 'chat_instance_id')

  await transaction.commit()
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('chat_instances_rag_indices')
}
