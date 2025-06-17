import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { ActivityPeriod, CourseUnit, Locales } from '../../types'
import { sequelize } from '../connection'
import type Responsibility from './responsibilities'

class ChatInstance extends Model<InferAttributes<ChatInstance>, InferCreationAttributes<ChatInstance>> {
  declare id: CreationOptional<string>

  declare name: Locales

  declare description: string

  declare model: string

  declare usageLimit: number

  declare resetCron: string | null

  /**
   * the Course Unit Realisation id. The term "course" is a bit misleading
   */
  declare courseId: string | null

  declare activityPeriod: ActivityPeriod | null

  declare courseActivityPeriod: ActivityPeriod | null

  declare courseUnitRealisationTypeUrn: string | null

  declare courseUnits: CreationOptional<CourseUnit[]>

  declare saveDiscussions: boolean

  declare notOptoutSaving: boolean

  declare responsibilities?: Responsibility[]
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
      allowNull: true,
      defaultValue: null,
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
