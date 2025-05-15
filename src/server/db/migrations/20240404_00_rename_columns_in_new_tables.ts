import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('enrolments', 'chatInstanceId', 'chat_instance_id')
  await queryInterface.renameColumn('enrolments', 'userId', 'user_id')
  await queryInterface.renameColumn('responsibilities', 'chatInstanceId', 'chat_instance_id')
  await queryInterface.renameColumn('responsibilities', 'userId', 'user_id')
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('enrolments', 'chat_instance_id', 'chatInstanceId')
  await queryInterface.renameColumn('enrolments', 'user_id', 'userId')
  await queryInterface.renameColumn('responsibilities', 'chat_instance_id', 'chatInstanceId')
  await queryInterface.renameColumn('responsibilities', 'user_id', 'userId')
}
