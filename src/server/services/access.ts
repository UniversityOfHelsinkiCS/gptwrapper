const checkAccess = (iamGroups: string[]) =>
  iamGroups.some((iamGroup) =>
    ['hy-ypa-opa-henkilosto', 'grp-curregpt'].includes(iamGroup)
  )

export default checkAccess
