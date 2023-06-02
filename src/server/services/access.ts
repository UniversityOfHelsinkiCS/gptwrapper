const checkAccess = (iamGroups: string[]) =>
  iamGroups.some((iamGroup) =>
    ['hy-ypa-opa-henkilosto', 'grp-curregpt', 'grp-curregc'].includes(iamGroup)
  )

export default checkAccess
