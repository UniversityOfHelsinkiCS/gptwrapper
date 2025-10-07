import { accessIams } from "./config";

export const checkIamAccess = (iamGroups: string[]) => accessIams.some((iam) => iamGroups.includes(iam))
