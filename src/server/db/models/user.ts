import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize'

import { sequelize } from '../connection'

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: string

  declare username: string

  declare language: CreationOptional<string>

  declare isAdmin: boolean

  declare isPowerUser: boolean

  declare iamGroups: string[]

  declare usage: number

  declare activeCourseIds: CreationOptional<string[]>
}

User.init(
  {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING,
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isPowerUser: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    iamGroups: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    usage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    activeCourseIds: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    underscored: true,
    sequelize,
  }
)

export default User
