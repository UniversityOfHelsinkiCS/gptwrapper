import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  queryInterface.addConstraint('enrolments', {
    type: 'foreign key',
    fields: ['user_id'],
    name: 'FK_enrolments_user_id',
    references: {
      table: 'users',
      field: 'id',
    },
    onDelete: 'cascade',
    onUpdate: 'cascade',
  })
  queryInterface.addConstraint('enrolments', {
    type: 'foreign key',
    fields: ['chat_instance_id'],
    name: 'FK_enrolments_chat_instance_id',
    references: {
      table: 'chat_instances',
      field: 'id',
    },
    onDelete: 'cascade',
    onUpdate: 'cascade',
  })
  queryInterface.addConstraint('responsibilities', {
    type: 'foreign key',
    fields: ['user_id'],
    name: 'FK_responsibilities_user_id',
    references: {
      table: 'users',
      field: 'id',
    },
    onDelete: 'cascade',
    onUpdate: 'cascade',
  })
  queryInterface.addConstraint('responsibilities', {
    type: 'foreign key',
    fields: ['chat_instance_id'],
    name: 'FK_responsibilities_chat_instance_id',
    references: {
      table: 'chat_instances',
      field: 'id',
    },
    onDelete: 'cascade',
    onUpdate: 'cascade',
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeConstraint('enrolments', 'FK_enrolments_user_id')
  await queryInterface.removeConstraint('enrolments', 'FK_enrolments_chat_instance_id')
  await queryInterface.removeConstraint('responsibilities', 'FK_responsibilities_user_id')
  await queryInterface.removeConstraint('responsibilities', 'FK_responsibilities_chat_instance_id')
}
