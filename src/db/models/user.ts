import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
} from 'sequelize'

import { sequelize } from '../connection'

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: string

  declare username: string

  declare language: string
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
  },
  {
    underscored: true,
    sequelize,
  }
)

export default User
