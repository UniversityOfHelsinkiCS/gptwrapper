import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('chat_instances', 'not_optout_saving', {
    type: DataTypes.BOOLEAN,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('chat_instances', 'not_optout_saving')
}
