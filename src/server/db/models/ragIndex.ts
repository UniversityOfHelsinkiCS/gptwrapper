import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, NonAttribute } from 'sequelize'

import { sequelize } from '../connection'
import type { RagIndexMetadata } from '../../../shared/types'
import type ChatInstance from './chatInstance'

class RagIndex extends Model<InferAttributes<RagIndex>, InferCreationAttributes<RagIndex>> {
  declare id: CreationOptional<number>

  declare userId: string

  declare metadata: RagIndexMetadata

  declare chatInstances?: NonAttribute<ChatInstance[]>

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
    tableName: 'rag_indices',
    sequelize,
  },
)

export default RagIndex

export type RagIndexAttributes = InferAttributes<RagIndex>
