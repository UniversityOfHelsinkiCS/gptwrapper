import User from './user'
import ChatInstance from './chatInstance'
import UserChatInstanceUsage from './userChatInstanceUsage'
import Prompt from './prompt'

User.belongsToMany(ChatInstance, {
  through: UserChatInstanceUsage,
  as: 'chatInstances',
})
ChatInstance.belongsToMany(User, {
  through: UserChatInstanceUsage,
  as: 'users',
})
UserChatInstanceUsage.belongsTo(User, { as: 'user' })
ChatInstance.hasMany(UserChatInstanceUsage, { as: 'usage' })
UserChatInstanceUsage.belongsTo(ChatInstance, { as: 'chatInstance' })
ChatInstance.hasMany(Prompt, { as: 'prompts' })
Prompt.belongsTo(ChatInstance, { as: 'chatInstance' })

export { User, ChatInstance, UserChatInstanceUsage, Prompt }
