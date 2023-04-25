import { User } from '../models'

const users = [
  {
    id: 'hy-hlo-123',
    username: 'testUser',
    language: 'fi',
    isAdmin: true,
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
