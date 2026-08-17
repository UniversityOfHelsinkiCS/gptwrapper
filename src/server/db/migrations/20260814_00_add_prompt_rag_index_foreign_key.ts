import type { Migration } from '../connection'

const constraintName = 'FK_prompts_rag_index_id'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    UPDATE prompts
    SET rag_index_id = NULL
    WHERE rag_index_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM rag_indices
        WHERE rag_indices.id = prompts.rag_index_id
      )
  `)

  await queryInterface.addConstraint('prompts', {
    type: 'foreign key',
    fields: ['rag_index_id'],
    name: constraintName,
    references: {
      table: 'rag_indices',
      field: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeConstraint('prompts', constraintName)
}
