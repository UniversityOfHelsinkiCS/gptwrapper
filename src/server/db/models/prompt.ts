import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { Message } from '../../types'
import { sequelize } from '../connection'

class Prompt extends Model<InferAttributes<Prompt>, InferCreationAttributes<Prompt>> {
  declare id: CreationOptional<string>

  declare name: string

  declare chatInstanceId: string

  declare systemMessage: string

  declare messages: CreationOptional<Message[]>

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
    chatInstanceId: {
      type: DataTypes.STRING,
      allowNull: false,
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
