import { inDevelopment } from '../util/config'
import { User } from '../db/models'

const parseIamGroups = (iamGroups: string) =>
  iamGroups?.split(';').filter(Boolean) ?? []

const checkAdmin = (iamGroups: string[]) =>
  iamGroups.some((iamGroup) =>
    ['grp-globalcampus', 'grp-toska'].includes(iamGroup)
  )

const mockHeaders = {
  uid: 'testUser',
  preferredlanguage: 'fi',
  hypersonsisuid: 'hy-hlo-123',
  hygroupcn: 'grp-toska;hy-employees',
}

const userMiddleware = async (req: any, _res: any, next: any) => {
  const headers = inDevelopment ? mockHeaders : req.headers

  const {
    uid: username,
    preferredlanguage: language,
    hypersonsisuid: id,
    hygroupcn,
  } = headers

  const iamGroups = parseIamGroups(hygroupcn)

  const user = {
    id,
    username,
    language,
    iamGroups,
    isAdmin: checkAdmin(iamGroups),
  }

  // Global Campus might not have hypersonsisuid
  if (user.isAdmin && !id) user.id = username

  if (user.id && user.username) await User.upsert(user)

  req.user = user

  return next()
}

export default userMiddleware
