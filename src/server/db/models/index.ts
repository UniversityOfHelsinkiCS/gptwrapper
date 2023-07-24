import User from './user'
import Service from './service'
import UserServiceUsage from './userServiceUsage'
import serviceAccessGroup from './serviceAccessGroup'

User.belongsToMany(Service, { through: UserServiceUsage, as: 'services' })
Service.belongsToMany(User, { through: UserServiceUsage, as: 'users' })
User.hasMany(UserServiceUsage, { as: 'usage' })
UserServiceUsage.belongsTo(User, { as: 'user' })
Service.hasMany(UserServiceUsage, { as: 'usage' })
UserServiceUsage.belongsTo(Service, { as: 'service' })
Service.hasMany(serviceAccessGroup, { as: 'accessGroups' })
serviceAccessGroup.belongsTo(Service, { as: 'service' })

export { User, Service, UserServiceUsage }
