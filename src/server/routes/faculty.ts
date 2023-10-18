import express from 'express'

import { getOrganisationData } from '../util/jami'

const facultyIamsMap: { [key: string]: string[] } = {
  H10: ['hy-ttdk-allstaff', 'hy-ttdk-employees'],
  H20: ['hy-oiktdk-allstaff', 'hy-oiktdk-employees'],
  H30: ['hy-ltdk-allstaff', 'hy-ltdk-employees'],
  H40: ['hy-humtdk-allstaff', 'hy-humtdk-employees'],
  H50: ['hy-mltdk-allstaff', 'hy-mltdk-employees'],
  H55: ['hy-ftdk-allstaff', 'hy-ftdk-employees'],
  H57: ['hy-bytdk-allstaff', 'hy-bytdk-employees'],
  H60: ['hy-ktdk-allstaff', 'hy-ktdk-employees'],
  H70: ['hy-valttdk-allstaff', 'hy-valttdk-employees'],
  H74: ['hy-sskh-allstaff', 'hy-sskh-employees'],
  H80: ['hy-mmtdk-allstaff', 'hy-mmtdk-employees'],
  H90: ['hy-eltdk-allstaff', 'hy-eltdk-employees'],
  H906: ['hy-kielikeskus-allstaff', 'hy-kielikeskus-employees'],
}

const facultyRouter = express.Router()

facultyRouter.get('/', async (_, res) => {
  const organisationData = (await getOrganisationData()) || []

  const faculties = organisationData.map(({ code, name }) => ({
    code,
    name,
    iams: facultyIamsMap[code] || [],
  }))

  return res.send(faculties)
})

export default facultyRouter
