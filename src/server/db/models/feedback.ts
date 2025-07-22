import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../connection'

class Feedback extends Model {
  public id!: number
  public userId!: string
  public responseWanted!: boolean
  public metadata!: object
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Feedback.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    responseWanted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'feedbacks',
    underscored: true,
    timestamps: true,
  },
)

export default Feedback
