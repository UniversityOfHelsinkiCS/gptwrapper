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
      en: 'Faculty of Theology',
      sv: 'Teologiska fakulteten',
      fi: 'Teologinen tiedekunta',
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
      en: 'Faculty of Law',
      sv: 'Juridiska fakulteten',
      fi: 'Oikeustieteellinen tiedekunta',
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
      fi: 'Lääketieteellinen tiedekunta',
      en: 'Faculty of Medicine',
      sv: 'Medicinska fakulteten',
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
      fi: 'Humanistinen tiedekunta',
      en: 'Faculty of Arts',
      sv: 'Humanistiska fakulteten',
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
      fi: 'Matemaattis-luonnontieteellinen tiedekunta',
      en: 'Faculty of Science',
      sv: 'Matematisk-naturvetenskapliga fakulteten',
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
      fi: 'Farmasian tiedekunta',
      en: 'Faculty of Pharmacy',
      sv: 'Farmaceutiska fakulteten',
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
      fi: 'Bio- ja ympäristötieteellinen tiedekunta',
      en: 'Faculty of Biological and Environmental Sciences',
      sv: 'Bio- och miljövetenskapliga fakulteten',
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
      fi: 'Kasvatustieteellinen tiedekunta',
      en: 'Faculty of Educational Sciences',
      sv: 'Pedagogiska fakulteten',
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
      fi: 'Valtiotieteellinen tiedekunta',
      en: 'Faculty of Social Sciences',
      sv: 'Statsvetenskapliga fakulteten',
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
      fi: 'Svenska social- och kommunalhögskolan',
      en: 'Swedish School of Social Science',
      sv: 'Svenska social- och kommunalhögskolan',
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
      fi: 'Maatalous-metsätieteellinen tiedekunta',
      en: 'Faculty of Agriculture and Forestry',
      sv: 'Agrikultur-forstvetenskapliga fakulteten',
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
      fi: 'Eläinlääketieteellinen tiedekunta',
      en: 'Faculty of Veterinary Medicine',
      sv: 'Veterinärmedicinska fakulteten',
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
      fi: 'Kielikeskus',
      en: 'Language Centre',
      sv: 'Språkcentrum',
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
      en: 'CurreChat sandbox',
      sv: 'CurreChat sandbox',
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
    model: 'mock',
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

export const TEST_USERS = {
  enrolled: 'grp-currechat-demostudents',
  teachers: 'grp-currechat-demoteachers',
}
