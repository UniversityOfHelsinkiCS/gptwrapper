import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'
import { RagIndexMetadata } from '../../../shared/types'

class RagIndex extends Model<InferAttributes<RagIndex>, InferCreationAttributes<RagIndex>> {
  declare id: CreationOptional<number>

  declare userId: string

  declare courseId?: string

  declare metadata: RagIndexMetadata
}

RagIndex.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default RagIndex

export type RagIndexAttributes = InferAttributes<RagIndex>
