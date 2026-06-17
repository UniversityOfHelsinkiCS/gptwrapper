import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'


class PromptChatInstance extends Model<InferAttributes<PromptChatInstance>, InferCreationAttributes<PromptChatInstance>> {
  declare id: CreationOptional<number>

  declare chatInstanceId: string

  declare promptId: string

  declare createdAt: CreationOptional<Date>

  declare updatedAt: CreationOptional<Date>


}

PromptChatInstance.init(
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
    promptId: {
      type: DataTypes.STRING,
      allowNull: false,
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
    tableName: 'prompts_chat_instances',
    sequelize,
    indexes: [
      {
        unique: true,
        fields: ['chat_instance_id', 'prompt_id'],
      },
    ],
  },
)

export default PromptChatInstance
