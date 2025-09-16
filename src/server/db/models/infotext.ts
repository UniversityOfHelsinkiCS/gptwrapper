import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'
import { Locales } from '@shared/types'


class InfoText extends Model<InferAttributes<InfoText>, InferCreationAttributes<InfoText>> {
  declare id: CreationOptional<string>

  declare name: string

  declare text: Locales
}

InfoText.init(
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
      unique: true,
    },
    text: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default InfoText
