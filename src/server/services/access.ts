import { accessIams } from '../util/config'

const checkAccess = (iamGroups: string[]) =>
  iamGroups.some((iam) => accessIams.includes(iam))

export default checkAccess
