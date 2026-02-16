import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, NonAttribute } from 'sequelize'

import { sequelize } from '../connection'
import type Prompt from './prompt'

class PromptUsage extends Model<InferAttributes<PromptUsage>, InferCreationAttributes<PromptUsage>> {
  declare id: CreationOptional<string>

  declare chatInstanceId: string

  declare promptId: string | null

  declare userId: string

  declare tokenCount: number

  declare createdAt: CreationOptional<Date>

  declare prompt?: NonAttribute<Prompt>
}

PromptUsage.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    chatInstanceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    promptId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tokenCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default PromptUsage
