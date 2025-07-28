export const devUserHeaders = {
  uid: 'testUser',
  mail: 'veikko@toska.test.dev',
  preferredlanguage: 'fi',
  hypersonsisuid: 'dev-hlo-123',
  hygroupcn: 'grp-toska;hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
}

export const getTestUserHeaders = (idx: string) => ({
  uid: `testTestUser-${idx}`,
  mail: `ben-${idx}@toska.test.test`,
  preferredlanguage: 'fi',
  hypersonsisuid: `test-hlo-${idx}`,
  hygroupcn: 'grp-toska;hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
})
