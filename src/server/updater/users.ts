import { User } from '../db/models'
import { mangleData } from './mangleData'
import { safeBulkCreate } from './util'

const parsePreferredLanguageUrnToLanguage = (urn: string) => {
  const fallBackLanguage = 'en'
  if (!urn) return fallBackLanguage
  const possibleLanguages = ['fi', 'en', 'sv']
  const splitArray = urn.split(':')
  const language = splitArray[splitArray.length - 1]
  return possibleLanguages.includes(language) ? language : fallBackLanguage
}

interface SisuUser {
  id: string
  preferredLanguageUrn: string
  eduPersonPrincipalName: string
  firstNames: string
  lastName: string
  primaryEmail: string
  studentNumber: string
}

const usersHandler = async (users: SisuUser[]) => {
  // eslint-disable-next-line arrow-body-style
  const parsedUsers = users.map((user) => {
    return {
      id: user.id,
      language: parsePreferredLanguageUrnToLanguage(user.preferredLanguageUrn),
      username: user.eduPersonPrincipalName
        ? user.eduPersonPrincipalName.split('@')[0]
        : user.id,
      active_course_ids: [],
      lastName: user.lastName,
      firstNames: user.firstNames,
      studentNumber: user.studentNumber,
      primaryEmail: user.primaryEmail,
    }
  })

  const fieldsToUpdate = [
    'language',
    'username',
    'lastName',
    'last_name',
    'firstNames',
    'studentNumber',
    'primaryEmail',
  ]

  await safeBulkCreate({
    entityName: 'User',
    entities: parsedUsers,
    bulkCreate: async (e, opt) => User.bulkCreate(e, opt),
    fallbackCreate: async (e, opt) => User.upsert(e, opt),
    bulkCreateOptions: {
      updateOnDuplicate: fieldsToUpdate,
    },
    fallbackCreateOptions: {
      fields: fieldsToUpdate,
    },
  })
  console.log(`[UPDATER] Updated ${users.length} users`)
}

export const fetchUsers = async () => {
  await mangleData('persons', 10_000, usersHandler)
}
