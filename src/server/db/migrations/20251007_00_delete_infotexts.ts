import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('infotexts')
}

export const down: Migration = async ({ context: queryInterface }) => {
  // Dont bother.
}
