import { type CreationOptional, DataTypes, type InferAttributes, type InferCreationAttributes, Model } from 'sequelize'

import type { CustomMessage } from '../../types'
import { sequelize } from '../connection'

export const PromptTypeValues = ['CHAT_INSTANCE', 'PERSONAL'] as const
export type PromptType = (typeof PromptTypeValues)[number]

class Prompt extends Model<InferAttributes<Prompt>, InferCreationAttributes<Prompt>> {
  declare id: CreationOptional<string>

  declare name: string

  declare type: PromptType

  declare chatInstanceId?: string

  declare userId?: string

  declare ragIndexId?: number

  declare systemMessage: string

  declare messages: CreationOptional<CustomMessage[]>

  declare hidden: CreationOptional<boolean>

  declare mandatory: CreationOptional<boolean>
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
      type: DataTypes.STRING,
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
      defaultValue: false,
    },
    mandatory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default Prompt
