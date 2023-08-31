import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize'

import { ActivityPeriod } from '../../types'
import { sequelize } from '../connection'

class Service extends Model<
  InferAttributes<Service>,
  InferCreationAttributes<Service>
> {
  declare id: CreationOptional<string>

  declare name: string

  declare description: string

  declare model: string

  declare usageLimit: number

  declare resetCron: string | null

  declare courseId: string | null

  declare activityPeriod: ActivityPeriod | null
}

Service.init(
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
      defaultValue: 'Untitled',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'No description',
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'gpt-3.5-turbo',
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    resetCron: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    courseId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    activityPeriod: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    underscored: true,
    sequelize,
  }
)

export default Service
