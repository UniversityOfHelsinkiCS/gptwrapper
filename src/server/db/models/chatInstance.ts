import { type CreationOptional, DataTypes, type InferAttributes, type InferCreationAttributes, Model, type NonAttribute } from 'sequelize'

import type { ActivityPeriod, CourseUnit, Locales } from '../../types'
import { sequelize } from '../connection'
import type Prompt from './prompt'
import type RagIndex from './ragIndex'
import type Responsibility from './responsibilities'
import type Enrolment from './enrolment'
import type UserChatInstanceUsage from './userChatInstanceUsage'

class ChatInstance extends Model<InferAttributes<ChatInstance>, InferCreationAttributes<ChatInstance>> {
  declare id: CreationOptional<string>

  declare name: Locales

  declare description: CreationOptional<string>

  declare model: CreationOptional<string>

  declare usageLimit: CreationOptional<number>

  declare resetCron: CreationOptional<string | null>

  /**
   * the Course Unit Realisation id. The term "course" is a bit misleading
   */
  declare courseId: CreationOptional<string | null>

  declare activityPeriod: ActivityPeriod

  declare courseActivityPeriod: CreationOptional<ActivityPeriod | null>

  declare courseUnitRealisationTypeUrn: CreationOptional<string | null>

  declare courseUnits: CreationOptional<CourseUnit[]>

  declare saveDiscussions: boolean

  declare notOptoutSaving: boolean

  declare responsibilities?: NonAttribute<Responsibility[]>

  declare ragIndices?: NonAttribute<RagIndex[]>

  declare prompts?: NonAttribute<Prompt[]>

  declare enrolments?: NonAttribute<Enrolment[]>

  declare currentUserUsage?: NonAttribute<UserChatInstanceUsage>
}

ChatInstance.init(
  {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'No description',
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'gpt-4o',
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    resetCron: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    courseId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      unique: true,
    },
    activityPeriod: {
      type: DataTypes.JSON,
    },
    courseActivityPeriod: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    courseUnitRealisationTypeUrn: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    courseUnits: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      allowNull: true,
      defaultValue: [],
    },
    saveDiscussions: {
      type: DataTypes.BOOLEAN,
    },
    notOptoutSaving: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default ChatInstance
