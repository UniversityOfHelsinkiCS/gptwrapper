import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'

class UniversityPrompt extends Model<InferAttributes<UniversityPrompt>, InferCreationAttributes<UniversityPrompt>> {
  declare id: CreationOptional<string>

  declare fi: string | null

  declare en: string | null

  declare sv: string | null

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
    fi: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    en: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sv: {
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
    sequelize,
  },
)

export default UniversityPrompt
