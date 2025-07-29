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

export const TEST_COURSES = {
  OTE_SANDBOX: {
    id: 'sandbox',
    courseId: 'sandbox',
    name: {
      en: 'OTE sandbox',
      sv: 'OTE sandbox',
      fi: 'OTE:n hiekkalaatikko',
    },
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2026-08-31',
    },
    code: 'OTE-1234',
  },
  TEST_COURSE: {
    id: 'test-course',
    courseId: 'test-course',
    name: {
      en: 'Test course',
      sv: 'Testkurs',
      fi: 'Testikurssi',
    },
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2030-08-31',
    },
    code: 'TEST-1234',
    model: 'mock',
  },
  EXAMPLE_COURSE: {
    id: 'esimerkit',
    courseId: 'example',
    name: {
      en: 'Example course',
      sv: 'Exempelkurs',
      fi: 'Esimerkkikurssi',
    },
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2024-09-02',
    },
    code: 'ESI-1234',
  },
}

export const TEST_USER_IDS = [
  'hy-hlo-95971222',
  'hy-hlo-1442996',
  'otm-688bac31-4ddf-4b81-a562-6cea8260262a',
  'hy-hlo-129129327',
  'hy-hlo-45702058',
  'hy-hlo-1397482',
]
export const TEST_USERS = {
  enrolled: 'grp-currechat-demostudents',
  teachers: 'grp-currechat-demoteachers',
}
