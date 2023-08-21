import User from './user'
import Service from './service'
import UserServiceUsage from './userServiceUsage'
import ServiceAccessGroup from './serviceAccessGroup'
import Prompt from './prompt'

User.belongsToMany(Service, { through: UserServiceUsage, as: 'services' })
Service.belongsToMany(User, { through: UserServiceUsage, as: 'users' })
User.hasMany(UserServiceUsage, { as: 'usage' })
UserServiceUsage.belongsTo(User, { as: 'user' })
Service.hasMany(UserServiceUsage, { as: 'usage' })
UserServiceUsage.belongsTo(Service, { as: 'service' })
Service.hasMany(ServiceAccessGroup, { as: 'accessGroups' })
ServiceAccessGroup.belongsTo(Service, { as: 'service' })
Service.hasMany(Prompt, { as: 'prompts' })
Prompt.belongsTo(Service, { as: 'service' })

export { User, Service, UserServiceUsage, ServiceAccessGroup, Prompt }
