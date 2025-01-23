import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('chat_instances', 'save_discussions', {
    type: DataTypes.BOOLEAN,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('chat_instances', 'save_discussions')
}
