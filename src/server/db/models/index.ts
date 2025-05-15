import User from './user'
import ChatInstance from './chatInstance'
import UserChatInstanceUsage from './userChatInstanceUsage'
import Prompt from './prompt'
import Enrolment from './enrolment'
import Responsibility from './responsibilities'
import Discussion from './discussion'
import RagIndex from './ragIndex'

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

Enrolment.belongsTo(User, { as: 'user' })

User.hasMany(Enrolment, { as: 'enrolments' })

Enrolment.belongsTo(ChatInstance, { as: 'chatInstance' })

ChatInstance.hasMany(Enrolment, { as: 'enrolments' })

Responsibility.belongsTo(User, { as: 'user' })

User.hasMany(Responsibility, { as: 'responsibilities' })

Responsibility.belongsTo(ChatInstance, { as: 'chatInstance' })

ChatInstance.hasMany(Responsibility, { as: 'responsibilities' })

User.hasMany(RagIndex, { as: 'ragIndices' })

RagIndex.belongsTo(User, { as: 'user' })

export {
  User,
  ChatInstance,
  UserChatInstanceUsage,
  Prompt,
  Enrolment,
  Responsibility,
  Discussion,
  RagIndex,
}
