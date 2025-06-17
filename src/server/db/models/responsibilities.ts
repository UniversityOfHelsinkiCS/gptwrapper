import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'
import type User from './user'

class Responsibility extends Model<InferAttributes<Responsibility>, InferCreationAttributes<Responsibility>> {
  declare id: CreationOptional<string>

  declare userId: string

  declare chatInstanceId: string

  declare user?: User
}

Responsibility.init(
  {
    id: {
      type: DataTypes.STRING,
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
  },
  {
    underscored: true,
    sequelize,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'chat_instance_id'],
      },
    ],
  },
)

export default Responsibility
