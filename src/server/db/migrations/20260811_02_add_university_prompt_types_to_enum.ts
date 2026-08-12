import type { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`ALTER TYPE "enum_prompts_type" ADD VALUE IF NOT EXISTS 'UNIVERSITY'`)
  await queryInterface.sequelize.query(`ALTER TYPE "enum_prompts_type" ADD VALUE IF NOT EXISTS 'TEMPLATE'`)
}

// No-op: Postgres cannot remove a value from an enum type.
export const down: Migration = async () => {}
