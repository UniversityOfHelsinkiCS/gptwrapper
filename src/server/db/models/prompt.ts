import { type CreationOptional, DataTypes, type InferAttributes, type InferCreationAttributes, Model, NonAttribute } from 'sequelize'

import type { Message } from '@shared/chat'
import { sequelize } from '../connection'
import RagIndex from './ragIndex'
import type UniversityPrompt from './universityPrompt'
export const PromptTypeValues = ['CHAT_INSTANCE', 'PERSONAL', 'UNIVERSITY', 'TEMPLATE'] as const
export type PromptType = (typeof PromptTypeValues)[number]

export const PromptLanguageValues = ['fi', 'en', 'sv'] as const
export type PromptLanguage = (typeof PromptLanguageValues)[number]

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

  declare universityPromptId?: CreationOptional<string | null>

  declare language?: CreationOptional<PromptLanguage | null>

  declare universityPrompt?: NonAttribute<UniversityPrompt>
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
      onDelete: 'SET NULL',
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
    universityPromptId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    underscored: true,
    sequelize,
    modelName: 'Prompt',
    tableName: 'prompts',
    indexes: [
      {
        fields: ['chat_instance_id'],
        name: 'prompts_chat_instance_id_idx',
      },
    ],
  },
)

export default Prompt
