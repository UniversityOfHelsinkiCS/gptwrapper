import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

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

  // Raw SQL on purpose: models describe the *current* schema, so using them here
  // would break as soon as a later migration adds a column (see 20260811_01).
  await queryInterface.sequelize.query(
    `
    insert into prompts_chat_instances (chat_instance_id, prompt_id, created_at, updated_at)
    select p.chat_instance_id, p.id, now(), now()
    from prompts p
    join chat_instances ci on ci.id = p.chat_instance_id
    where p.chat_instance_id is not null
    `,
    { transaction },
  )

  await transaction.commit()
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('prompts_chat_instances')
}
