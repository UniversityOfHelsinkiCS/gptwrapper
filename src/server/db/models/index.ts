import User from './user'
import Service from './service'
import UserServiceUsage from './userServiceUsage'
import ServiceAccessGroup from './serviceAccessGroup'

User.belongsToMany(Service, { through: UserServiceUsage, as: 'services' })
Service.belongsToMany(User, { through: UserServiceUsage, as: 'users' })
User.hasMany(UserServiceUsage, { as: 'usage' })
UserServiceUsage.belongsTo(User, { as: 'user' })
Service.hasMany(UserServiceUsage, { as: 'usage' })
UserServiceUsage.belongsTo(Service, { as: 'service' })
Service.hasMany(ServiceAccessGroup, { as: 'accessGroups' })
ServiceAccessGroup.belongsTo(Service, { as: 'service' })

export { User, Service, UserServiceUsage, ServiceAccessGroup }
