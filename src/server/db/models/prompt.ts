import { type CreationOptional, DataTypes, type InferAttributes, type InferCreationAttributes, Model, NonAttribute } from 'sequelize'

import type { Message } from '@shared/chat'
import { sequelize } from '../connection'
import RagIndex from './ragIndex'
export const PromptTypeValues = ['CHAT_INSTANCE', 'PERSONAL'] as const
export type PromptType = (typeof PromptTypeValues)[number]

class Prompt extends Model<InferAttributes<Prompt>, InferCreationAttributes<Prompt>> {
  declare id: CreationOptional<string>

  declare name: string

  declare type: PromptType

  declare chatInstanceId?: string

  declare userId?: string

  declare ragIndexId?: number | null

  declare systemMessage: string

  declare messages: CreationOptional<Message[]>

  declare hidden: CreationOptional<boolean>

  declare ragHidden: CreationOptional<boolean>

  declare ragIndex?: NonAttribute<RagIndex>

  declare userInstructions?: CreationOptional<string>

}

Prompt.init(
  {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...PromptTypeValues),
      allowNull: false,
    },
    chatInstanceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ragIndexId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: RagIndex,
        key: 'id',
      },
    },
    systemMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    messages: {
      type: DataTypes.ARRAY(DataTypes.JSON),
      allowNull: false,
      defaultValue: [],
    },
    hidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    ragHidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    userInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default Prompt
