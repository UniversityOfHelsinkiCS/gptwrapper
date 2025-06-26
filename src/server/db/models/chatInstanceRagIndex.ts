import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, NonAttribute } from 'sequelize'

import { sequelize } from '../connection'
import type User from './user'

class ChatInstanceRagIndex extends Model<InferAttributes<ChatInstanceRagIndex>, InferCreationAttributes<ChatInstanceRagIndex>> {
  declare id: CreationOptional<number>

  declare chatInstanceId: string

  declare ragIndexId: number

  declare userId: CreationOptional<string | null>

  declare createdAt: CreationOptional<Date>

  declare updatedAt: CreationOptional<Date>

  declare user?: NonAttribute<User>
}

ChatInstanceRagIndex.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    chatInstanceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ragIndexId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    underscored: true,
    tableName: 'chat_instances_rag_indices',
    sequelize,
    indexes: [
      {
        unique: true,
        fields: ['chat_instance_id', 'rag_index_id'],
      },
    ],
  },
)

export default ChatInstanceRagIndex
