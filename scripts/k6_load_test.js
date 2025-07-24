/**
 * This script requires the use of k6 docker image version
 *
 * run using: docker run --rm -i grafana/k6 run - <script.js
 */

import http from 'k6/http'
import { sleep, check } from 'k6'

const staging = 'http://gptwrapper.toska.svc.cluster.local:8000/api/ai/stream'
const local = 'http://172.17.0.1:3000/api//ai/stream'

const vusit = 50

export const options = {
  vus: vusit,
  iterations: vusit,
  // duration: "1s",
}

const messages = [
  'listaa viisi numeroa',
  'listaa viisi väriä',
  'listaa viisi esinettä',
  'listaa viisi makua',
  'listaa viisi huonekalua',
  'listaa viisi presidenttiä',
  'listaa viisi maata',
  'listaa viisi ohjelmointikieltä',
  'listaa viisi kaupunkia',
  'listaa viisi vaatemerkkiä',
  'listaa viisi urheilulajia',
]

const data = {
  options: {
    messages: [
      { role: 'system', content: 'Olet avulias avustaja' },
      {
        role: 'user',
        content: undefined, // will be substituted from messages list
      },
    ],
    assistantInstructions: 'Olet avulias avustaja',
    model: 'mock',
    modelTemperature: 0.5,
    saveConsent: false,
    prevResponseId: '',
    courseId: 'sandbox',
  },
  courseId: 'sandbox',
}

function tokensToText(tokenizedStr) {
  return tokenizedStr
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line).text
      } catch {
        return ''
      }
    })
    .join('')
}

export default function () {
  const url = `${staging}/v2`

  for (const message of messages) {
    const dataCopy = { ...data }
    dataCopy.options.messages = [
      { role: 'system', content: 'Olet load testissä' },
      {
        role: 'user',
        content: message,
      },
    ]
    const updatedData = dataCopy

    const payload = JSON.stringify({
      data: JSON.stringify(updatedData),
    })
    const params = {
      headers: {
        'Content-Type': 'application/json',
        uid: 'testUser',
        mail: 'veikko@toska.test.dev',
        preferredlanguage: 'fi',
        hypersonsisuid: 'hy-hlo-123',
        hygroupcn: 'grp-toska;hy-employees;grp-currechat-demostudents;grp-currechat-demoteachers',
      },
    }

    let res = http.post(url, payload, params)
    console.log('📌', tokensToText(res.body))
    check(res, { 'status is 200': (res) => res.status === 200 })
    sleep(5)
  }
}
