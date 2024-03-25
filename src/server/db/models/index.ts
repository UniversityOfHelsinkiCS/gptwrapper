import User from './user'
import ChatInstance from './chatInstance'
import UserServiceUsage from './userServiceUsage'
import Prompt from './prompt'

User.belongsToMany(ChatInstance, {
  through: UserServiceUsage,
  as: 'chatInstances',
})
ChatInstance.belongsToMany(User, { through: UserServiceUsage, as: 'users' })
UserServiceUsage.belongsTo(User, { as: 'user' })
ChatInstance.hasMany(UserServiceUsage, { as: 'usage' })
UserServiceUsage.belongsTo(ChatInstance, { as: 'chatInstance' })
ChatInstance.hasMany(Prompt, { as: 'prompts' })
Prompt.belongsTo(ChatInstance, { as: 'chatInstance' })

export { User, ChatInstance, UserServiceUsage, Prompt }
