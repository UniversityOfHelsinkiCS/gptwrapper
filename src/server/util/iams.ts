import { accessIams } from './config'

// TODO: rename this, or check if still useful
export const checkIamAccess = (iamGroups: string[]) => accessIams.some((iam) => iamGroups.includes(iam))
