import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  // add unique constaraint on user_id and chat_instance_id
  queryInterface.addConstraint('responsibilities', {
    fields: ['user_id', 'chat_instance_id'],
    type: 'unique',
    name: 'responsibilities_user_id_chat_instance_id',
  })
  queryInterface.addConstraint('enrolments', {
    fields: ['user_id', 'chat_instance_id'],
    type: 'unique',
    name: 'enrolments_user_id_chat_instance_id',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  // remove unique constaraint on user_id and chat_instance_id
  queryInterface.removeConstraint('responsibilities', 'responsibilities_user_id_chat_instance_id')
  queryInterface.removeConstraint('enrolments', 'enrolments_user_id_chat_instance_id')
}
