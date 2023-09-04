import { inDevelopment } from '../../config'
import { User } from '../types'
import { adminIams } from '../util/config'
import { checkCourseAccess, getOwnCourses } from '../services/access'

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

  const user: User = {
    id: id || username,
    username,
    email,
    language,
    iamGroups,
    isAdmin: checkAdmin(iamGroups),
    ownCourses: [],
    activeCourseIds: [],
  }

  const enrolledCourses = await checkCourseAccess(id)
  const teacherCourses = await getOwnCourses(id, user.isAdmin)

  const courses = enrolledCourses.concat(teacherCourses)

  user.ownCourses = teacherCourses
  user.activeCourseIds = courses

  req.user = user

  return next()
}

export default userMiddleware
