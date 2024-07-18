import {
  Issuer,
  Strategy,
  TokenSet,
  UnknownObject,
  UserinfoResponse,
} from 'openid-client'
import passport from 'passport'

import {
  OIDC_ISSUER,
  OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET,
  OIDC_REDIRECT_URI,
  adminIams,
  powerUserIam,
} from './config'
import type { User as UserType } from '../types'
import { User } from '../db/models/index'
import {
  checkIamAccess,
  getEnrolledCourses,
  getOwnCourses,
} from '../chatInstances/access'
import { getUsage } from '../chatInstances/usage'
import logger from './logger'

interface OidcUserInfo {
  uid: string
  hyPersonSisuId: string
  email: string
  hyGroupCn: string[]
  preferredLanguage: string
}

const params = {
  claims: {
    id_token: {
      uid: { essential: true },
      hyPersonSisuId: { essential: true },
    },
    userinfo: {
      email: { essential: true },
      hyGroupCn: { essential: true },
      preferredLanguage: null,
      given_name: null,
      family_name: null,
    },
  },
}

const checkAdmin = (iamGroups: string[]) =>
  iamGroups.some((iam) => adminIams.includes(iam))

const isPowerUser = (iamGroups: string[]) => iamGroups.includes(powerUserIam)

const getClient = async () => {
  const issuer = await Issuer.discover(OIDC_ISSUER)
  const client = new issuer.Client({
    client_id: OIDC_CLIENT_ID,
    client_secret: OIDC_CLIENT_SECRET,
    redirect_uris: [OIDC_REDIRECT_URI],
    response_types: ['code'],
  })

  return client
}

export const getUser = (userinfo: OidcUserInfo): UserType => {
  const {
    uid: username,
    hyPersonSisuId: id,
    email,
    hyGroupCn: iamGroups,
    preferredLanguage: language,
  } = userinfo as unknown as OidcUserInfo

  return {
    username,
    id: id || username,
    email,
    iamGroups,
    language,
    isAdmin: checkAdmin(iamGroups),
    isPowerUser: isPowerUser(iamGroups),
  }
}

const verifyLogin = async (
  _tokenSet: TokenSet,
  userinfo: UserinfoResponse<UnknownObject, UnknownObject>,
  done: (err: any, user?: unknown) => void
) => {
  const user = getUser(userinfo as unknown as OidcUserInfo)

  const { id, isAdmin, iamGroups } = user

  if (!id) {
    return done(new Error('User not found'))
  }

  const hasIamAccess = checkIamAccess(iamGroups)

  const enrolledCourses = await getEnrolledCourses(user)
  const teacherCourses = await getOwnCourses(user)

  const courses = enrolledCourses.concat(teacherCourses)
  const hasCourseAccess = courses.length > 0

  if (!isAdmin && !hasIamAccess && !hasCourseAccess) {
    logger.info('Unauthorized user', { iamGroups })
    return done(new Error('Unauthorized'))
  }

  user.ownCourses = teacherCourses
  user.activeCourseIds = courses

  await User.upsert(user)

  const usage = await getUsage(id)

  return done(null, { ...user, usage, hasIamAccess: isAdmin || hasIamAccess })
}

const setupAuthentication = async () => {
  const client = await getClient()

  passport.serializeUser((user, done) => {
    const { id, iamGroups, isAdmin } = user as UserType

    return done(null, { id, iamGroups, isAdmin })
  })

  passport.deserializeUser(
    async ({ id, iamGroups }: { id: string; iamGroups: string[] }, done) => {
      const user = await User.findByPk(id)

      if (!user) return done(new Error('User not found'))

      return done(null, { ...user.dataValues, iamGroups })
    }
  )

  passport.use('oidc', new Strategy({ client, params }, verifyLogin))
}

export default setupAuthentication
