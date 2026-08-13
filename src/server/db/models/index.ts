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
import Feedback from './feedback'
import Notification from './Notification'
import PromptUsage from './promptUsage'
import PromptChatInstance from './promptChatInstance'
import UniversityPrompt from './universityPrompt'

/**
 * Foreign keys are always named explicitly. Without `foreignKey`, `hasMany` and
 * `belongsToMany` derive it from the *source model name* (`RagIndex` -> `RagIndexId`)
 * rather than from the alias, which defines a second attribute on top of the one the
 * model already declares. Both map to the same underscored column, so the model ends up
 * serialising e.g. both `ragIndexId` and `RagIndexId`, and writes race over one column.
 */

User.belongsToMany(ChatInstance, {
  through: UserChatInstanceUsage,
  as: 'chatInstances',
  foreignKey: 'userId',
  otherKey: 'chatInstanceId',
})

ChatInstance.belongsToMany(User, {
  through: UserChatInstanceUsage,
  as: 'users',
  foreignKey: 'chatInstanceId',
  otherKey: 'userId',
})

Prompt.belongsToMany(ChatInstance, {
  through: PromptChatInstance,
  as: 'chatInstances',
  foreignKey: 'promptId',
  otherKey: 'chatInstanceId',
})

ChatInstance.belongsToMany(Prompt, {
  through: PromptChatInstance,
  as: 'prompts',
  foreignKey: 'chatInstanceId',
  otherKey: 'promptId',
})

UserChatInstanceUsage.belongsTo(User, { as: 'user' })

ChatInstance.hasMany(UserChatInstanceUsage, { as: 'usage', foreignKey: 'chatInstanceId' })

UserChatInstanceUsage.belongsTo(ChatInstance, { as: 'chatInstance' })

User.hasMany(Prompt, { as: 'prompts', foreignKey: 'userId' })

Prompt.belongsTo(ChatInstance, { as: 'chatInstance' })

Prompt.belongsTo(User, { as: 'user' })

Prompt.belongsTo(RagIndex, { as: 'ragIndex' })

Enrolment.belongsTo(User, { as: 'user' })

User.hasMany(Enrolment, { as: 'enrolments', foreignKey: 'userId' })

Enrolment.belongsTo(ChatInstance, { as: 'chatInstance' })

ChatInstance.hasMany(Enrolment, { as: 'enrolments', foreignKey: 'chatInstanceId' })

Responsibility.belongsTo(User, { as: 'user' })

User.hasMany(Responsibility, { as: 'responsibilities', foreignKey: 'userId' })

Responsibility.belongsTo(ChatInstance, { as: 'chatInstance' })

ChatInstance.hasMany(Responsibility, { as: 'responsibilities', foreignKey: 'chatInstanceId' })

User.hasMany(RagIndex, { as: 'ragIndices', foreignKey: 'userId' })

RagIndex.belongsTo(User, { as: 'user' })

RagFile.belongsTo(RagIndex, { as: 'ragIndex' })

RagIndex.hasMany(RagFile, { as: 'ragFiles', foreignKey: 'ragIndexId' })

RagIndex.hasMany(Prompt, { as: 'prompts', foreignKey: 'ragIndexId' })

RagFile.belongsTo(User, { as: 'user' })

/**
 * Everyone's favourite super-many-to-many relationship
 */
RagIndex.belongsToMany(ChatInstance, { as: 'chatInstances', through: ChatInstanceRagIndex, foreignKey: 'ragIndexId', otherKey: 'chatInstanceId' })
ChatInstance.belongsToMany(RagIndex, { as: 'ragIndices', through: ChatInstanceRagIndex, foreignKey: 'chatInstanceId', otherKey: 'ragIndexId' })
RagIndex.hasMany(ChatInstanceRagIndex, { as: 'chatInstancesRagIndices', foreignKey: 'ragIndexId' })
ChatInstance.hasMany(ChatInstanceRagIndex, { as: 'chatInstancesRagIndices', foreignKey: 'chatInstanceId' })
ChatInstanceRagIndex.belongsTo(ChatInstance, { as: 'chatInstance' })
ChatInstanceRagIndex.belongsTo(RagIndex, { as: 'ragIndex' })
ChatInstanceRagIndex.belongsTo(User, { as: 'user' })

Feedback.belongsTo(User, { as: 'user' })
User.hasMany(Feedback, { as: 'feedbacks', foreignKey: 'userId' })

PromptUsage.belongsTo(Prompt, { as: 'prompt' })
Prompt.hasMany(PromptUsage, { as: 'promptUsages', foreignKey: 'promptId' })
PromptUsage.belongsTo(ChatInstance, { as: 'chatInstance' })
ChatInstance.hasMany(PromptUsage, { as: 'promptUsages', foreignKey: 'chatInstanceId' })
PromptUsage.belongsTo(User, { as: 'user' })

UniversityPrompt.hasMany(Prompt, { as: 'prompts', foreignKey: 'universityPromptId' })
Prompt.belongsTo(UniversityPrompt, { as: 'universityPrompt' })

export {
  User,
  ChatInstance,
  UserChatInstanceUsage,
  Prompt,
  Enrolment,
  Responsibility,
  Discussion,
  RagIndex,
  RagFile,
  ChatInstanceRagIndex,
  Feedback,
  Notification,
  PromptUsage,
  PromptChatInstance,
  UniversityPrompt,
}
