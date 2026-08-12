import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, NonAttribute } from 'sequelize'

import { sequelize } from '../connection'
import type Prompt from './prompt'

class UniversityPrompt extends Model<InferAttributes<UniversityPrompt>, InferCreationAttributes<UniversityPrompt>> {
  declare id: CreationOptional<string>

  declare published: CreationOptional<boolean>

  declare prompts?: NonAttribute<Prompt[]>

  declare createdAt: CreationOptional<Date>

  declare updatedAt: CreationOptional<Date>
}

UniversityPrompt.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    sequelize,
  },
)

export default UniversityPrompt
