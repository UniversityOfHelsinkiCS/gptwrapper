import { inDevelopment } from '../../config'
import { adminIams } from '../util/config'
import { User } from '../db/models'

const parseIamGroups = (iamGroups: string) =>
  iamGroups?.split(';').filter(Boolean) ?? []

const checkAdmin = (iamGroups: string[]) =>
  iamGroups.some((iam) => adminIams.includes(iam))

const mockHeaders = {
  uid: 'testUser',
  mail: 'grp-toska@helsinki.fi',
  preferredlanguage: 'fi',
  hypersonsisuid: 'hy-hlo-123',
  hygroupcn: 'grp-toska;hy-employees',
}

const userMiddleware = async (req: any, _res: any, next: any) => {
  const headers = inDevelopment ? mockHeaders : req.headers

  const {
    uid: username,
    mail: email,
    preferredlanguage: language,
    hypersonsisuid: id,
    hygroupcn,
  } = headers

  const iamGroups = parseIamGroups(hygroupcn)

  const user = {
    id: id || username,
    username,
    email,
    language,
    iamGroups,
    isAdmin: checkAdmin(iamGroups),
  }

  if (username) await User.upsert(user)

  req.user = user

  return next()
}

export default userMiddleware
