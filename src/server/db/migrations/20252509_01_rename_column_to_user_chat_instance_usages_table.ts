import { DataTypes } from 'sequelize'

import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('user_chat_instance_usages', 'totalUsageCount', 'total_usage_count')
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('user_chat_instance_usages', 'total_usage_count', 'totalUsageCount')
}
