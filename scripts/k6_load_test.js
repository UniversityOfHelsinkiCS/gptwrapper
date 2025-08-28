/**
 * This script requires the use of k6 docker image and it needs to be run inside the docker container. Check the command below
 * The k6 modules are imported from within the docker container. So it is not a dependency in Currechat
 *
 * run using: docker run --rm -i grafana/k6 run - <scripts/k6_load_test.js
 */

import http from 'k6/http'
import { sleep, check } from 'k6'

const staging = 'http://gptwrapper.toska.svc.cluster.local:8000/api/ai/stream'
const local = 'http://172.17.0.1:3000/api//ai/stream'

// k6 will pickup the options object internally.
const vusit = 10
export const options = {
  vus: vusit,
  iterations: vusit,
}

const headers = {
  headers: {
    'Content-Type': 'application/json',
    uid: 'testUser',
    mail: 'veikko@toska.test.dev',
    preferredlanguage: 'fi',
    hypersonsisuid: 'hy-hlo-123',
    hygroupcn: 'grp-toska;hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
  },
}

const data = {
  options: {
    messages: [],
    assistantInstructions: 'Olet avulias avustaja',
    model: 'gpt-4o-mini',
    modelTemperature: 0.5,
    saveConsent: false,
    prevResponseId: '',
    courseId: 'sandbox',
  },
  courseId: 'sandbox',
}

const messages = ['listaa viisi esinettä', 'kerro niistä jotain', 'anna esimerkki jokaisesta esineestä', 'kerro yksityiskohtaisemmin', 'tiivistä kertomasi']

function handleTokens(tokenizedStr) {
  let texts = []
  let responseId = ''

  tokenizedStr
    .split('\n')
    .filter(Boolean)
    .forEach((line) => {
      try {
        const parsedLine = JSON.parse(line)
        if (parsedLine.text) texts.push(parsedLine.text)
        if (parsedLine.prevResponseId) responseId = parsedLine.prevResponseId
      } catch {
        console.log('📌 error parsing line')
      }
    })

  const response = texts
    .join('')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return { response, responseId }
}

export default function () {
  const url = `${staging}/`
  let prevResponseId = ''

  for (const message of messages) {
    const newData = { ...data }
    newData.options.messages = [{ role: 'user', content: message }]
    newData.options.prevResponseId = prevResponseId

    const payload = JSON.stringify({
      data: JSON.stringify(newData),
    })

    let res = http.post(url, payload, headers)
    const { response, responseId } = handleTokens(res.body)
    prevResponseId = responseId

    console.log('📌 response:', response)
    check(res, { 'status is 200': (res) => res.status === 200 })
    sleep(5)
  }
}
