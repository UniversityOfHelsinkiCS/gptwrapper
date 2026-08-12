import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

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
    user_id: {
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

  // Create ChatInstanceRagIndices from old relations.
  // Raw SQL on purpose: models describe the *current* schema, so using them here
  // would break as soon as a later migration changes the columns they map to.
  await queryInterface.sequelize.query(
    `
    insert into chat_instances_rag_indices (chat_instance_id, rag_index_id, created_at, updated_at)
    select r.chat_instance_id, r.id, now(), now()
    from rag_indices r
    join chat_instances ci on ci.id = r.chat_instance_id
    where r.chat_instance_id is not null
    `,
    { transaction },
  )

  await queryInterface.removeColumn('rag_indices', 'chat_instance_id', { transaction })

  await transaction.commit()
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('chat_instances_rag_indices')
}
