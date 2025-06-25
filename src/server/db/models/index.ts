import User from './user'
import ChatInstance from './chatInstance'
import UserChatInstanceUsage from './userChatInstanceUsage'
import Prompt from './prompt'
import Enrolment from './enrolment'
import Responsibility from './responsibilities'
import Discussion from './discussion'
import RagIndex from './ragIndex'
import RagFile from './ragFile'
import ChatInstanceRagIndex from './chatInstanceRagIndex'

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

User.hasMany(Prompt, { as: 'prompts' })

Prompt.belongsTo(ChatInstance, { as: 'chatInstance' })

Prompt.belongsTo(User, { as: 'user' })

Prompt.belongsTo(RagIndex, { as: 'ragIndex' })

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

RagFile.belongsTo(RagIndex, { as: 'ragIndex' })

RagIndex.hasMany(RagFile, { as: 'ragFiles' })

RagFile.belongsTo(User, { as: 'user' })

/**
 * Everyone's favourite super-many-to-many relationship
 */
RagIndex.belongsToMany(ChatInstance, { as: 'chatInstances', through: ChatInstanceRagIndex })
ChatInstance.belongsToMany(RagIndex, { as: 'ragIndices', through: ChatInstanceRagIndex })
RagIndex.hasMany(ChatInstanceRagIndex, { as: 'chatInstancesRagIndices' })
ChatInstance.hasMany(ChatInstanceRagIndex, { as: 'chatInstancesRagIndices' })
ChatInstanceRagIndex.belongsTo(ChatInstance, { as: 'chatInstance' })
ChatInstanceRagIndex.belongsTo(RagIndex, { as: 'ragIndex' })
ChatInstanceRagIndex.belongsTo(User, { as: 'user' })

export { User, ChatInstance, UserChatInstanceUsage, Prompt, Enrolment, Responsibility, Discussion, RagIndex, RagFile, ChatInstanceRagIndex }
