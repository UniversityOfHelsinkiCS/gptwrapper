import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize'

import { Message } from '../../types'
import { sequelize } from '../connection'

class Prompt extends Model<
  InferAttributes<Prompt>,
  InferCreationAttributes<Prompt>
> {
  declare id: string

  declare serviceId: string

  declare systemMessage: string

  declare messages: CreationOptional<Message[]>
}

Prompt.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    serviceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    systemMessage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    messages: {
      type: DataTypes.ARRAY(DataTypes.JSON),
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    underscored: true,
    sequelize,
  }
)

export default Prompt
