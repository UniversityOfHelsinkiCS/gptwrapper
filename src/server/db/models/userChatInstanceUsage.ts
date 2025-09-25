import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'

class UserChatInstanceUsage extends Model<InferAttributes<UserChatInstanceUsage>, InferCreationAttributes<UserChatInstanceUsage>> {
  declare id: CreationOptional<string>

  declare userId: string

  declare chatInstanceId: string

  declare usageCount: CreationOptional<number>

  declare totalUsageCount: CreationOptional<number>
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
  },
  {
    underscored: true,
    sequelize,
  },
)

export default UserChatInstanceUsage
