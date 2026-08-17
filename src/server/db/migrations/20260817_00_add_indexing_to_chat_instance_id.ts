import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addIndex('prompts', ['chat_instance_id'], {
    name: 'prompts_chat_instance_id_idx',
  })
  await queryInterface.addIndex('responsibilities', ['chat_instance_id'], {
    name: 'responsibilities_chat_instance_id_idx',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeIndex('prompts', 'prompts_chat_instance_id_idx')
  await queryInterface.removeIndex('prompts', 'responsibilities_chat_instance_id_idx')
}
