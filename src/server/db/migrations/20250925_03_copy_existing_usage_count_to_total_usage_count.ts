import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`  
    UPDATE user_chat_instance_usages   
    SET total_usage_count = usage_count   
    WHERE total_usage_count IS NULL OR total_usage_count = 0;  
  `)
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`  
    UPDATE user_chat_instance_usages   
    SET total_usage_count = 0;  
  `)
}
