import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  const transaction = await queryInterface.sequelize.transaction()

  await queryInterface.renameColumn('rag_indices', 'course_id', 'chat_instance_id', { transaction })

  // Migrate existing rag_indices
  const ragIndices = (await queryInterface.sequelize.query(
    `
    SELECT * FROM rag_indices
  `,
    { transaction, type: 'SELECT' },
  )) as any[]

  for await (const ragIndex of ragIndices) {
    const chatInstances = (await queryInterface.sequelize.query(
      `
      SELECT * FROM chat_instances WHERE id = ${ragIndex.chat_instance_id}
    `,
      { transaction, type: 'SELECT' },
    )) as any[]

    // Best guess. Its fine if its not perfect always, shouldnt have much rags at this stage anyways...
    const chatInstanceId = chatInstances?.[0]?.id ?? null

    await queryInterface.sequelize.query(
      `
      UPDATE rag_indices SET chat_instance_id = ${chatInstanceId} WHERE id = ${ragIndex.id}
    `,
      { transaction },
    )
  }

  await transaction.commit()
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('rag_indices', 'chat_instance_id', 'course_id')
}
