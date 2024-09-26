import { Migration } from '../connection'
import { User, Enrolment } from '../models'

const tmpAccounts = [
  '4k117746',
  '4k117747',
  '4k117748',
  '4k117749',
  '4k117750',
  '4k117751',
  '4k117752',
  '4k117753',
  '4k117754',
  '4k117755',
  '4k117756',
  '4k117757',
  '4k117758',
  '4k117759',
  '4k117760',
  '4k117761',
  '4k117762',
  '4k117763',
  '4k117764',
  '4k117765',
  '4k117766',
  '4k117767',
  '4k117768',
  '4k117769',
]

const chatInstanceId = '16d246ca-f9a5-4bf3-9d6e-824b261193df'

export const up: Migration = async () => {
  const userPromises = tmpAccounts.map((userId) => {
    const user = {
      id: userId,
      username: userId,
      lastName: userId,
    }
    return User.upsert(user)
  })
  await Promise.all(userPromises)

  const enrolmentPromises = tmpAccounts.map((userId) => {
    const enrolment = {
      userId,
      chatInstanceId,
    }
    return Enrolment.upsert(enrolment)
  })
  await Promise.all(enrolmentPromises)
}

export const down: Migration = async () => {}
