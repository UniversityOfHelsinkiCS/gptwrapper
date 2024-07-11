import { Migration } from '../connection'

export const up: Migration = async ({ context: queryInterface }) => {
  const [, metadata1] = await queryInterface.sequelize.query(`
    delete from responsibilities a USING responsibilities b WHERE a.user_id = b.user_id AND a.chat_instance_id = b.chat_instance_id and a.id < b.id;
  `)
  // @ts-expect-error
  console.log('Deleted responsibilities duplicates', metadata1.rowCount)
  const [, metadata2] = await queryInterface.sequelize.query(`
    delete from enrolments a USING enrolments b WHERE a.user_id = b.user_id AND a.chat_instance_id = b.chat_instance_id and a.id < b.id;
  `)
  // @ts-expect-error
  console.log('Deleted enrolments duplicates', metadata2.rowCount)
}

export const down: Migration = async () => {}
