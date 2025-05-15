import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addIndex('chat_instances', {
    unique: true,
    name: 'chat_instances_course_id_unique',
    fields: ['course_id'],
    concurrently: true,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeIndex('chat_instances', 'chat_instances_course_id_unique')
}
