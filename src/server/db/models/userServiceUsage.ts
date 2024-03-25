import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize'

import { sequelize } from '../connection'

class UserServiceUsage extends Model<
  InferAttributes<UserServiceUsage>,
  InferCreationAttributes<UserServiceUsage>
> {
  declare id: CreationOptional<string>

  declare userId: string

  declare chatInstanceId: string

  declare usageCount: number
}

UserServiceUsage.init(
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
  },
  {
    underscored: true,
    sequelize,
  }
)

export default UserServiceUsage
