import { Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, DataTypes, type NonAttribute } from 'sequelize'

import { sequelize } from '../connection'
import type User from './user'

class Responsibility extends Model<InferAttributes<Responsibility>, InferCreationAttributes<Responsibility>> {
  declare id: CreationOptional<string>

  declare userId: string

  declare user?: NonAttribute<User>

  declare chatInstanceId: string

  declare createdByUserId: CreationOptional<string>
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
    createdByUserId: { // tells who manually created the responsibility, (null = created by updater)
      type: DataTypes.STRING,
      allowNull: true
    }
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
