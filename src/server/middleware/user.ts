import { inCI, inDevelopment } from '../../config'
import { adminIams, powerUserIam } from '../util/config'

const parseIamGroups = (iamGroups: string) =>
  iamGroups?.split(';').filter(Boolean) ?? []

const checkAdmin = (iamGroups: string[]) =>
  iamGroups.some((iam) => adminIams.includes(iam))

const isPowerUser = (iamGroups: string[]) => iamGroups.includes(powerUserIam)

const mockHeaders = {
  uid: 'testUser',
  mail: 'grp-toska@helsinki.fi',
  preferredlanguage: 'fi',
  hypersonsisuid: 'hy-hlo-123',
  hygroupcn: 'grp-toska;hy-employees',
}

const userMiddleware = async (req: any, _res: any, next: any) => {
  const headers = inDevelopment || inCI ? mockHeaders : req.headers

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
    isPowerUser: isPowerUser(iamGroups),
  }

  req.user = user

  return next()
}

export default userMiddleware
