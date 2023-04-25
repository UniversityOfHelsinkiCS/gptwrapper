const checkAccess = (iamGroups: string[]) =>
  iamGroups.some((iamGroup) => ['grp-toska'].includes(iamGroup))

export default checkAccess
