import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'
import { RagIndexMetadata } from '../../../shared/types'

class RagIndex extends Model<InferAttributes<RagIndex>, InferCreationAttributes<RagIndex>> {
  declare id: CreationOptional<number>

  declare userId: string

  declare courseId?: string

  declare metadata: RagIndexMetadata

  declare filenames: string[]
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
    filenames: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default RagIndex

export type RagIndexAttributes = InferAttributes<RagIndex>
