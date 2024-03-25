import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize'

import { sequelize } from '../connection'

class Enrolment extends Model<
  InferAttributes<Enrolment>,
  InferCreationAttributes<Enrolment>
> {
  declare id: CreationOptional<string>

  declare userId: string

  declare chatInstanceId: string
}

Enrolment.init(
  {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    chatInstanceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    underscored: true,
    sequelize,
  }
)

export default Enrolment
