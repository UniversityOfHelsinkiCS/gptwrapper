import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'
import { RagIndexMetadata } from '../../../shared/types'

class RagIndex extends Model<InferAttributes<RagIndex>, InferCreationAttributes<RagIndex>> {
  declare id: CreationOptional<number>

  declare userId: string

  declare chatInstanceId?: string

  declare metadata: RagIndexMetadata

  getRedisIndexName() {
    return `${this.id}-${this.metadata.name}`
  }

  getRedisIndexPrefix() {
    return `idx:${this.getRedisIndexName()}`
  }
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
    chatInstanceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        hasName(value: any) {
          if (value && typeof value === 'object' && !value.name) {
            throw new Error('metadata must have a name property')
          }
        },
      },
    },
  },
  {
    underscored: true,
    sequelize,
  },
)

export default RagIndex

export type RagIndexAttributes = InferAttributes<RagIndex>
