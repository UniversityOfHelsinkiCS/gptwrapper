import { Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: string

  declare username: string

  declare language: CreationOptional<string>

  declare isAdmin: boolean

  declare isPowerUser: boolean

  declare iamGroups: string[]

  declare usage: number

  declare totalUsage: bigint

  declare activeCourseIds: CreationOptional<string[]>

  declare lastName: string

  declare firstNames: string

  declare studentNumber: string

  declare primaryEmail: string
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
    totalUsage: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    activeCourseIds: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    firstNames: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    studentNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    primaryEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default User
