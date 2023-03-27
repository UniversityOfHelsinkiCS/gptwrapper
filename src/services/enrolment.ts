import { inStaging } from '../util/config'
import importerClient from '../util/importerClient'

const checkEnrolment = async (studentId: string, enrolmentId: string) => {
  if (inStaging) return true

  const { data: enrolments } = await importerClient.get(
    `/course_unit_realisations/${enrolmentId}/enrolments`
  )

  const studentEnrolment = enrolments.find(
    ({ personId }: any) => personId === studentId
  )

  return !!studentEnrolment
}

export default checkEnrolment
