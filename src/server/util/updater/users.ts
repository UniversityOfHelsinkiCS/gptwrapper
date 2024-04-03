import { User } from '../../db/models'
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
  callName: string
  firstNames: string
  primaryEmail: string
  secondaryEmail: string
  preferredLanguageUrn: string
  eduPersonPrincipalName: string
  has_study_right: boolean
}

const usersHandler = async (users: SisuUser[]) => {
  const parsedUsers = users.map((user) => ({
    id: user.id,
    language: parsePreferredLanguageUrnToLanguage(user.preferredLanguageUrn),
    username: user.eduPersonPrincipalName
      ? user.eduPersonPrincipalName.split('@')[0]
      : user.id,
    active_course_ids: [],
  }))

  // By default updates all fields on duplicate id
  await safeBulkCreate({
    entityName: 'User',
    entities: parsedUsers,
    bulkCreate: async (e, opt) => User.bulkCreate(e, opt),
    fallbackCreate: async (e, opt) => User.upsert(e, opt),
    options: {
      updateOnDuplicate: ['language', 'username'],
    },
  })
}

export const fetchUsers = async () => {
  await mangleData('persons', 10_000, usersHandler)
}
