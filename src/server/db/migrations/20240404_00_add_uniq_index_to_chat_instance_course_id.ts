import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addIndex('chat_instances', ['course_id'], {
    unique: true,
    name: 'chat_instances_course_id_unique',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeIndex(
    'chat_instances',
    'chat_instances_course_id_unique'
  )
}
