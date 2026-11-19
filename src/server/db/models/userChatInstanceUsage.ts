import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, NonAttribute } from 'sequelize'

import type { ModelUsage } from '@shared/usage'
import { sequelize } from '../connection'
import ChatInstance from './chatInstance'

class UserChatInstanceUsage extends Model<InferAttributes<UserChatInstanceUsage>, InferCreationAttributes<UserChatInstanceUsage>> {
  declare id: CreationOptional<string>

  declare userId: string

  declare chatInstanceId: string

  declare usageCount: CreationOptional<number>

  declare totalUsageCount: CreationOptional<number>

  /** Tokens by model since the weekly reset. */
  declare weeklyModelUsage: CreationOptional<ModelUsage>

  /** Tokens by model, never reset. */
  declare totalModelUsage: CreationOptional<ModelUsage>

  declare chatInstance?: NonAttribute<ChatInstance>
}

UserChatInstanceUsage.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    chatInstanceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalUsageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    weeklyModelUsage: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    totalModelUsage: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default UserChatInstanceUsage
