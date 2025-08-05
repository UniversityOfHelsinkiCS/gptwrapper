import { Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: string

  declare username: string

  declare language: CreationOptional<string>

  declare isAdmin: CreationOptional<boolean>

  declare isPowerUser: CreationOptional<boolean>

  declare iamGroups: CreationOptional<string[]>

  declare usage: CreationOptional<number>

  declare totalUsage: CreationOptional<bigint>

  declare activeCourseIds: CreationOptional<string[]>

  declare lastName: CreationOptional<string>

  declare firstNames: CreationOptional<string>

  declare studentNumber: CreationOptional<string>

  declare primaryEmail: CreationOptional<string>

  declare termsAcceptedAt: CreationOptional<Date | null>

  declare preferences: CreationOptional<Record<string, any>>

  declare lastLoggedInAt: CreationOptional<Date | null>
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
    termsAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    preferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    lastLoggedInAt: {
      type: DataTypes.DATE,
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
