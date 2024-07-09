import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize'

import { ActivityPeriod, Locales } from '../../types'
import { sequelize } from '../connection'

class ChatInstance extends Model<
  InferAttributes<ChatInstance>,
  InferCreationAttributes<ChatInstance>
> {
  declare id: CreationOptional<string>

  declare name: Locales

  declare description: string

  declare model: string

  declare usageLimit: number

  declare resetCron: string | null

  declare courseId: string | null

  declare activityPeriod: ActivityPeriod | null
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
      defaultValue: 'gpt-3.5-turbo',
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
    },
    activityPeriod: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    underscored: true,
    sequelize,
  }
)

export default ChatInstance
