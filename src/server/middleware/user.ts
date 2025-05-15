import { inCI, inDevelopment } from '../../config'
import { User as UserModel } from '../db/models'
import { User } from '../types'
import { adminIams, powerUserIam, statsViewerIams } from '../util/config'

const parseIamGroups = (iamGroups: string) => iamGroups?.split(';').filter(Boolean) ?? []

const checkAdmin = (iamGroups: string[]) => iamGroups.some((iam) => adminIams.includes(iam))

const isPowerUser = (iamGroups: string[]) => iamGroups.includes(powerUserIam)

const mockHeaders = {
  uid: 'testUser',
  mail: 'veikko@toska.test.dev',
  preferredlanguage: 'fi',
  hypersonsisuid: 'hy-hlo-123',
  hygroupcn: 'grp-toska;hy-employees',
}

const userMiddleware = async (req: any, _res: any, next: any) => {
  const headers = inDevelopment || inCI ? mockHeaders : req.headers

  const { uid: username, mail: email, preferredlanguage: language, hypersonsisuid: id, hygroupcn } = headers

  const iamGroups = parseIamGroups(hygroupcn)

  const excludeFromAdmin = ['mluukkai2']

  const acualUser: User = {
    id: id || username,
    username,
    email,
    language,
    iamGroups,
    isAdmin: !excludeFromAdmin.includes(username) && checkAdmin(iamGroups),
    isPowerUser: isPowerUser(iamGroups),
    isStatsViewer: checkAdmin(iamGroups) || statsViewerIams.some((iam) => iamGroups.includes(iam)),
  }

  const adminLoggedInAsId = req.headers['x-admin-logged-in-as']

  if (acualUser.isAdmin && adminLoggedInAsId) {
    const hijackedUser = await UserModel.findByPk(adminLoggedInAsId)
    if (!hijackedUser) {
      return next(new Error('User not found'))
    }
    const isStatsViewer = hijackedUser.isAdmin || statsViewerIams.some((iam) => hijackedUser.iamGroups.includes(iam))

    req.user = {
      email: acualUser.email,
      ...hijackedUser.toJSON(),
      isStatsViewer,
    }

    req.hijackedBy = acualUser
  } else {
    req.user = acualUser
  }

  return next()
}

export default userMiddleware
