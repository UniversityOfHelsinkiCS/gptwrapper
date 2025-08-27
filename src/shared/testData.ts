export const devUserHeaders = {
  uid: 'testUser',
  mail: 'veikko@toska.test.dev',
  preferredlanguage: 'fi',
  hypersonsisuid: 'dev-hlo-123',
  hygroupcn: 'grp-toska;hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
}

const testRoleToIams = {
  teacher: 'hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
  student: 'grp-students;',
  admin: 'grp-toska;hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
}

export const getTestUserHeaders = (idx: string, role: 'teacher' | 'student' | 'admin') => {
  return {
    uid: `testTestUser-${role}-${idx}`,
    mail: `ben-${role}-${idx}@toska.test.test`,
    preferredlanguage: 'en',
    hypersonsisuid: `test-hlo-${role}-${idx}`,
    hygroupcn: testRoleToIams[role],
  }
}

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
    usageLimit: 200_000,
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
  TOSKA: {
    id: 'toska',
    courseId: 'toska',
    name: {
      en: 'Toska',
      sv: 'Toska',
      fi: 'Toska',
    },
    activityPeriod: {
      startDate: '2025-08-26',
      endDate: '2100-08-26',
    },
    code: 'TOSKA-1234',
    usageLimit: 2_000_000,
  },
}

export const TEST_USERS = {
  enrolled: 'grp-currechat-demostudents',
  teachers: 'grp-currechat-demoteachers',
}
