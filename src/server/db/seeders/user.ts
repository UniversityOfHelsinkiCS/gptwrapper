import type { InferCreationAttributes } from 'sequelize'
import { User } from '../models'

const users: InferCreationAttributes<User>[] = [
  {
    id: 'hy-hlo-123',
    username: 'testUser',
    language: 'fi',
    isAdmin: true,
    iamGroups: ['grp-toska', 'hy-employees'],
    firstNames: 'Teppo',
    lastName: 'Tekoälytestaaja',
    isPowerUser: true,
    totalUsage: BigInt(0),
    usage: 0,
    primaryEmail: 'test@example.com',
    studentNumber: '123456',
    activeCourseIds: [],
    termsAcceptedAt: null,
    preferences: {},
    lastLoggedInAt: new Date(),
  },
]

const seedUsers = async () => {
  const operations: any[] = []

  users.forEach((user) => {
    const operation = User.upsert({
      ...user,
    })

    operations.push(operation)
  })

  await Promise.all(operations)
}

export default seedUsers
