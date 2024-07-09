import { DataTypes } from 'sequelize'
import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  queryInterface.changeColumn('chat_instances', 'name', {
    type: `JSONB USING CAST(jsonb_build_object('en', name, 'fi', name, 'sv', name) as JSONB)`,
    allowNull: false,
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  queryInterface.changeColumn('chat_instances', 'name', {
    type: DataTypes.STRING,
    allowNull: false,
  })
}
