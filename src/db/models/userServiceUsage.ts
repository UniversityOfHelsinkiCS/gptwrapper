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
  declare id: CreationOptional<number>

  declare userId: string

  declare serviceId: string

  declare usageCount: number
}

UserServiceUsage.init(
  {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceId: {
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
