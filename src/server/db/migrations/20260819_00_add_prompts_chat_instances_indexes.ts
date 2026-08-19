import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addIndex('prompts_chat_instances', ['chat_instance_id', 'prompt_id'], {
    name: 'prompts_chat_instances_chat_instance_id_prompt_id_idx',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeIndex('prompts_chat_instances', 'prompts_chat_instances_chat_instance_id_prompt_id_idx')
}
