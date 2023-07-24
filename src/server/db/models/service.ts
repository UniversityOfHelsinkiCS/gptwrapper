import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
} from 'sequelize'

import { sequelize } from '../connection'

class Service extends Model<
  InferAttributes<Service>,
  InferCreationAttributes<Service>
> {
  declare id: string

  declare name: string

  declare description: string

  declare usageLimit: string

  declare resetCron: string | null
}

Service.init(
  {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Untitled',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'No description',
    },
    usageLimit: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
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

export default Service
