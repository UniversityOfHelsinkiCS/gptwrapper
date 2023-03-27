import { User } from '../types'
import importerClient from '../util/importerClient'

const checkEnrolment = async (user: User, enrolmentId: string) => {
  if (user.iamGroups.includes('hy-employees')) return true

  const { data: enrolments } = await importerClient.get(
    `/course_unit_realisations/${enrolmentId}/enrolments`
  )

  const studentEnrolment = enrolments.find(
    ({ personId }: any) => personId === user.id
  )

  return !!studentEnrolment
}

export default checkEnrolment
