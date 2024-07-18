import { getEnrolledCourses, getOwnCourses } from '../chatInstances/access'
import { getUsage } from '../chatInstances/usage'
import { User as UserModel } from '../db/models'
import { User } from '../types'

const parseIamGroups = (iamGroups: string) =>
  iamGroups?.split(';').filter(Boolean) ?? []

const mockHeaders = {
  uid: 'testUser',
  mail: 'veikko@toska.test.dev',
  preferredlanguage: 'fi',
  hypersonsisuid: 'hy-hlo-123',
  hygroupcn: 'grp-toska;hy-employees',
}

const userMiddleware = async (req: any, res: any, next: any) => {
  if (req.path.includes('/login')) return next()

  const headers = mockHeaders

  const {
    uid: username,
    mail: email,
    preferredlanguage: language,
    hypersonsisuid: id,
    hygroupcn,
  } = headers

  const iamGroups = parseIamGroups(hygroupcn)

  const acualId = id || username

  const acualUser: User = {
    id: acualId,
    username,
    email,
    language,
    iamGroups,
    isAdmin: true,
    isPowerUser: true,
  }

  if (!acualId) {
    return res.status(401).send('User not found')
  }

  const enrolledCourses = await getEnrolledCourses(acualUser)
  const teacherCourses = await getOwnCourses(acualUser)

  const courses = enrolledCourses.concat(teacherCourses)

  acualUser.ownCourses = teacherCourses
  acualUser.activeCourseIds = courses

  await UserModel.upsert(acualUser)

  const usage = await getUsage(id)
  req.user = { ...acualUser, usage, hasIamAccess: true }

  return next()
}

export default userMiddleware
