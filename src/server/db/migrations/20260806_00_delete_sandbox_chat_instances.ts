import { QueryTypes } from 'sequelize'
import type { Migration } from '../connection'

/**
 * Removes the 14 faculty sandbox chat instances. The feature was removed from
 * the app in 18ee77c7; this drops the leftover data.
 *
 * The ids are inlined on purpose: this migration is the permanent record of
 * exactly which instances were dropped, and must keep working when replayed
 * from scratch long after `SANDBOXES` is gone from shared/testData.
 *
 * Note this does NOT include TEST_COURSES.OTE_SANDBOX ('sandbox'), which is a
 * live test course.
 */
const SANDBOX_IDS = [
  'teologinen-sandbox',
  'oikeustieteellinen-sandbox',
  'laaketieteellinen-sandbox',
  'humanistinen-sandbox',
  'matemaattisluonnontieteellinen-sandbox',
  'farmasia-sandbox',
  'bioYmparistotieteellinen-sandbox',
  'kasvatustieteellinen-sandbox',
  'valtiotieteellinen-sandbox',
  'sockom-sandbox',
  'maatalousMetsatieteellinen-sandbox',
  'elainlaaketieteellinen-sandbox',
  'kielikeskus-sandbox',
  'misc-sandbox',
]

export const up: Migration = async ({ context: queryInterface }) => {
  const { sequelize } = queryInterface
  const transaction = await sequelize.transaction()

  try {
    /**
     * Prompts belonging exclusively to the sandboxes. A prompt can be tied to a
     * chat instance through the legacy `prompts.chat_instance_id` column, through
     * `prompts_chat_instances`, or both — and the two do not always agree, so we
     * check both. A prompt that is also tied to a surviving chat instance is left
     * alone; it only loses its sandbox join row below.
     */
    const sandboxOnlyPrompts = await sequelize.query<{ id: string; has_owner: boolean }>(
      `
      WITH candidate AS (
        SELECT p.id, p.chat_instance_id, p.user_id
        FROM prompts p
        WHERE p.chat_instance_id IN (:ids)
           OR EXISTS (
             SELECT 1 FROM prompts_chat_instances pci
             WHERE pci.prompt_id = p.id AND pci.chat_instance_id IN (:ids)
           )
      )
      SELECT
        c.id,
        (c.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id)) AS has_owner
      FROM candidate c
      WHERE (c.chat_instance_id IS NULL OR c.chat_instance_id IN (:ids))
        AND NOT EXISTS (
          SELECT 1 FROM prompts_chat_instances pci
          WHERE pci.prompt_id = c.id AND pci.chat_instance_id NOT IN (:ids)
        )
      `,
      { replacements: { ids: SANDBOX_IDS }, type: QueryTypes.SELECT, transaction },
    )

    // A PERSONAL prompt with no owner is unreachable — /my-prompts filters on
    // userId + type — so those get deleted rather than converted.
    const convertibleIds = sandboxOnlyPrompts.filter((p) => p.has_owner).map((p) => p.id)
    const ownerlessIds = sandboxOnlyPrompts.filter((p) => !p.has_owner).map((p) => p.id)

    const [, joinRows] = await sequelize.query(`DELETE FROM prompts_chat_instances WHERE chat_instance_id IN (:ids)`, {
      replacements: { ids: SANDBOX_IDS },
      transaction,
    })
    // @ts-expect-error rowCount is not in the type
    console.log('Deleted prompts_chat_instances rows', joinRows.rowCount)

    if (convertibleIds.length > 0) {
      const [, converted] = await sequelize.query(
        `UPDATE prompts SET type = 'PERSONAL', chat_instance_id = NULL, updated_at = NOW() WHERE id IN (:ids)`,
        { replacements: { ids: convertibleIds }, transaction },
      )
      // @ts-expect-error rowCount is not in the type
      console.log('Converted sandbox prompts to PERSONAL', converted.rowCount)
    } else {
      console.log('Converted sandbox prompts to PERSONAL', 0)
    }

    if (ownerlessIds.length > 0) {
      const [, deleted] = await sequelize.query(`DELETE FROM prompts WHERE id IN (:ids)`, {
        replacements: { ids: ownerlessIds },
        transaction,
      })
      // @ts-expect-error rowCount is not in the type
      console.log('Deleted ownerless sandbox prompts', deleted.rowCount)
    } else {
      console.log('Deleted ownerless sandbox prompts', 0)
    }

    const [, promptUsages] = await sequelize.query(`DELETE FROM prompt_usages WHERE chat_instance_id IN (:ids)`, {
      replacements: { ids: SANDBOX_IDS },
      transaction,
    })
    // @ts-expect-error rowCount is not in the type
    console.log('Deleted prompt_usages rows', promptUsages.rowCount)

    // Only the link is removed. The rag index keeps its owner and stays
    // reachable as a personal (V2) index, so no Redis or S3 cleanup is implied.
    const [, ragLinks] = await sequelize.query(`DELETE FROM chat_instances_rag_indices WHERE chat_instance_id IN (:ids)`, {
      replacements: { ids: SANDBOX_IDS },
      transaction,
    })
    // @ts-expect-error rowCount is not in the type
    console.log('Deleted chat_instances_rag_indices rows', ragLinks.rowCount)

    // This FK is ON DELETE NO ACTION, so these must go before the chat instances.
    const [, usages] = await sequelize.query(`DELETE FROM user_chat_instance_usages WHERE chat_instance_id IN (:ids)`, {
      replacements: { ids: SANDBOX_IDS },
      transaction,
    })
    // @ts-expect-error rowCount is not in the type
    console.log('Deleted user_chat_instance_usages rows', usages.rowCount)

    // responsibilities and enrolments cascade, so count them for the record first.
    const [cascading] = await sequelize.query<{ responsibilities: string; enrolments: string }>(
      `
      SELECT
        (SELECT COUNT(*) FROM responsibilities WHERE chat_instance_id IN (:ids)) AS responsibilities,
        (SELECT COUNT(*) FROM enrolments WHERE chat_instance_id IN (:ids)) AS enrolments
      `,
      { replacements: { ids: SANDBOX_IDS }, type: QueryTypes.SELECT, transaction },
    )
    console.log('Cascading responsibilities', cascading.responsibilities, 'enrolments', cascading.enrolments)

    const [, chatInstances] = await sequelize.query(`DELETE FROM chat_instances WHERE id IN (:ids)`, {
      replacements: { ids: SANDBOX_IDS },
      transaction,
    })
    // @ts-expect-error rowCount is not in the type
    console.log('Deleted sandbox chat_instances', chatInstances.rowCount)

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export const down: Migration = async () => {
  // Irreversible. The chat instances themselves could be recreated from the old
  // SANDBOXES literal, but the responsibilities, usages and prompt usages cannot
  // — a partial restore would look like it worked. Restore from a backup instead.
}
