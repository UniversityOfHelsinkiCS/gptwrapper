export const devUserHeaders = {
  uid: 'testUser',
  mail: 'veikko@toska.test.dev',
  preferredlanguage: 'fi',
  hypersonsisuid: 'dev-hlo-123',
  hygroupcn: 'grp-toska;hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
}

const testRoleToIams = {
  teacher: 'hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
  student: 'grp-students',
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

//TODO: iamGroups for misc sandbox

export const SANDBOXES = {
  teologinen: {
    id: 'teologinen-sandbox',
    courseId: 'teologinen-sandbox',
    name: {
      en: 'Sandbox: Faculty of Theology',
      sv: 'Sandbox: Teologiska fakulteten',
      fi: 'Hiekkalaatikko: Teologinen tiedekunta',
    },
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H10',
    usageLimit: 200_000,
    iamGroups: ['hy-ttdk-allstaff', 'hy-ttdk-employees'],
  },
  oikeustieteellinen: {
    id: 'oikeustieteellinen-sandbox',
    courseId: 'oikeustieteellinen-sandbox',
    name: {
      en: 'Sandbox: Faculty of Law',
      sv: 'Sandbox: Juridiska fakulteten',
      fi: 'Hiekkalaatikko: Oikeustieteellinen tiedekunta',
    },
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H20',
    usageLimit: 200_000,
    iamGroups: ['hy-oiktdk-allstaff', 'hy-oiktdk-employees'],
  },
  laaketieteellinen: {
    id: 'laaketieteellinen-sandbox',
    courseId: 'laaketieteellinen-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H30',
    name: {
      fi: 'Hiekkalaatikko: Lääketieteellinen tiedekunta',
      en: 'Sandbox: Faculty of Medicine',
      sv: 'Sandbox: Medicinska fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-ltdk-allstaff', 'hy-ltdk-employees'],
  },
  humanistinen: {
    id: 'humanistinen-sandbox',
    courseId: 'humanistinen-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H40',
    name: {
      fi: 'Hiekkalaatikko: Humanistinen tiedekunta',
      en: 'Sandbox: Faculty of Arts',
      sv: 'Sandbox: Humanistiska fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-humtdk-allstaff', 'hy-humtdk-employees'],
  },
  matemaattisluonnontieteellinen: {
    id: 'matemaattisluonnontieteellinen-sandbox',
    courseId: 'matemaattisluonnontieteellinen-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H50',
    name: {
      fi: 'Hiekkalaatikko: Matemaattis-luonnontieteellinen tiedekunta',
      en: 'Sandbox: Sandbox: Faculty of Science',
      sv: 'Sandbox: Matematisk-naturvetenskapliga fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-mltdk-allstaff', 'hy-mltdk-employees'],
  },
  farmasia: {
    id: 'farmasia-sandbox',
    courseId: 'farmasia-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H55',
    name: {
      fi: 'Hiekkalaatikko: Farmasian tiedekunta',
      en: 'Sandbox: Faculty of Pharmacy',
      sv: 'Sandbox: Farmaceutiska fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-ftdk-allstaff', 'hy-ftdk-employees'],
  },
  bioYmparistotieteellinen: {
    id: 'bioYmparistotieteellinen-sandbox',
    courseId: 'bioYmparistotieteellinen-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H57',
    name: {
      fi: 'Hiekkalaatikko: Bio- ja ympäristötieteellinen tiedekunta',
      en: 'Sandbox: Faculty of Biological and Environmental Sciences',
      sv: 'Sandbox: Bio- och miljövetenskapliga fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-bytdk-allstaff', 'hy-bytdk-employees'],
  },
  kasvatustieteellinen: {
    id: 'kasvatustieteellinen-sandbox',
    courseId: 'kasvatustieteellinen-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H60',
    name: {
      fi: 'Hiekkalaatikko: Kasvatustieteellinen tiedekunta',
      en: 'Sandbox: Faculty of Educational Sciences',
      sv: 'Sandbox: Pedagogiska fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-ktdk-allstaff', 'hy-ktdk-employees'],
  },
  valtiotieteellinen: {
    id: 'valtiotieteellinen-sandbox',
    courseId: 'valtiotieteellinen-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H70',
    name: {
      fi: 'Hiekkalaatikko: Valtiotieteellinen tiedekunta',
      en: 'Sandbox: Faculty of Social Sciences',
      sv: 'Sandbox: Statsvetenskapliga fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-valttdk-allstaff', 'hy-valttdk-employees'],
  },
  sockom: {
    id: 'sockom-sandbox',
    courseId: 'sockom-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H74',
    name: {
      fi: 'Hiekkalaatikko: Svenska social- och kommunalhögskolan',
      en: 'Sandbox: Swedish School of Social Science',
      sv: 'Sandbox: Svenska social- och kommunalhögskolan',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-sskh-allstaff', 'hy-sskh-employees'],
  },
  maatalousMetsatieteellinen: {
    id: 'maatalousMetsatieteellinen-sandbox',
    courseId: 'maatalousMetsatieteellinen-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H80',
    name: {
      fi: 'Hiekkalaatikko: Maatalous-metsätieteellinen tiedekunta',
      en: 'Sandbox: Faculty of Agriculture and Forestry',
      sv: 'Sandbox: Agrikultur-forstvetenskapliga fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-mmtdk-allstaff', 'hy-mmtdk-employees'],
  },
  elainlaaketieteellinen: {
    id: 'elainlaaketieteellinen-sandbox',
    courseId: 'elainlaaketieteellinen-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H90',
    name: {
      fi: 'Hiekkalaatikko: Eläinlääketieteellinen tiedekunta',
      en: 'Sandbox: Faculty of Veterinary Medicine',
      sv: 'Sandbox: Veterinärmedicinska fakulteten',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-eltdk-allstaff', 'hy-eltdk-employees'],
  },
  kielikeskus: {
    id: 'kielikeskus-sandbox',
    courseId: 'kielikeskus-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H906',
    name: {
      fi: 'Hiekkalaatikko: Kielikeskus',
      en: 'Sandbox: Language Centre',
      sv: 'Sandbox: Språkcentrum',
    },
    usageLimit: 200_000,
    iamGroups: ['hy-kielikeskus-employees'],
  },
  misc: {
    id: 'misc-sandbox',
    courseId: 'misc-sandbox',
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2126-08-31',
    },
    code: 'H906',
    name: {
      fi: 'CurreChat hiekkalaatikko',
      en: 'Sandbox: CurreChat sandbox',
      sv: 'Sandbox: CurreChat sandbox',
    },
    usageLimit: 200_000,
  },
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
    usageLimit: 200_000,
  },
  TEST_COURSE: {
    id: 'test-course',
    courseId: 'test-course-course-id',
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
    usageLimit: 200_000,
  },
  EXAMPLE_COURSE: {
    id: 'esimerkit',
    courseId: 'example-course-id',
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
    usageLimit: 200_000,
  },
  TOSKA: {
    id: 'toska',
    courseId: 'toska-course-id',
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

/**
 * A per-worker course used only by the saved-discussions e2e test. Each Playwright
 * worker (and retry) gets its own course id so parallel runs never share discussion
 * rows. Created on demand via the /api/test/setup-discussion-test endpoint rather than
 * seeded, so it doesn't leak into the other tests' course lists.
 */
export const getDiscussionTestCourse = (idx: string | number) => {
  const id = `discussion-test-course-${idx}`
  return {
    id,
    courseId: id,
    name: {
      en: 'Saved discussions e2e',
      sv: 'Sparade diskussioner e2e',
      fi: 'Tallennetut keskustelut e2e',
    },
    activityPeriod: {
      startDate: '2024-09-01',
      endDate: '2030-08-31',
    },
    saveDiscussions: true,
    usageLimit: 200_000,
  }
}

export const TEST_USERS = {
  enrolled: 'grp-currechat-demostudents',
  teachers: 'grp-currechat-demoteachers',
}
