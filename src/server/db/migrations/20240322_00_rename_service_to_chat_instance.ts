import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('user_service_usages', 'service_id', 'chat_instance_id')
  await queryInterface.renameTable('services', 'chat_instances')
  await queryInterface.renameColumn('prompts', 'service_id', 'chat_instance_id')
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('prompts', 'chat_instance_id', 'service_id')
  await queryInterface.renameTable('chat_instances', 'services')
  await queryInterface.renameColumn('user_service_usages', 'chat_instance_id', 'service_id')
}
