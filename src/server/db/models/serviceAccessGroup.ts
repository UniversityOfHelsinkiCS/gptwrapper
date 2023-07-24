import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize'

import { sequelize } from '../connection'

class ServiceAcessGroup extends Model<
  InferAttributes<ServiceAcessGroup>,
  InferCreationAttributes<ServiceAcessGroup>
> {
  declare id: CreationOptional<string>

  declare serviceId: string

  declare iamGroup: string

  declare model: string

  declare usageLimit: string | null // override service usage limit

  declare resetCron: string | null
}

ServiceAcessGroup.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    serviceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    iamGroup: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'gpt-3.5-turbo',
    },
    usageLimit: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    resetCron: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    underscored: true,
    sequelize,
  }
)

export default ServiceAcessGroup
