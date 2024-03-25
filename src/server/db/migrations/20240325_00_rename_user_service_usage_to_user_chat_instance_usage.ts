import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameTable(
    'user_service_usages',
    'user_chat_instance_usages'
  )
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameTable(
    'user_chat_instance_usages',
    'user_service_usages'
  )
}
