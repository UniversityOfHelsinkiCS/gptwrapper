import User from './user'
import Service from './service'
import UserServiceUsage from './userServiceUsage'

User.hasMany(UserServiceUsage, { as: 'usage', foreignKey: 'userId' })
Service.hasMany(UserServiceUsage, { as: 'usage', foreignKey: 'serviceId' })

export { User, Service, UserServiceUsage }
