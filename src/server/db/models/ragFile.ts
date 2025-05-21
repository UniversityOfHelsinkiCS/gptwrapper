import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'
import { IngestionPipelineStageKey } from '../../../shared/constants'

class RagFile extends Model<InferAttributes<RagFile>, InferCreationAttributes<RagFile>> {
  declare id: CreationOptional<number>

  declare ragIndexId: number

  declare pipelineStage: CreationOptional<IngestionPipelineStageKey>

  declare error: CreationOptional<string | null>

  declare filename: string

  declare fileType: string

  declare fileSize: number

  declare numChunks: CreationOptional<number | null>

  declare userId: string

  declare metadata: Record<string, unknown> | null

  declare createdAt: CreationOptional<Date>

  declare updatedAt: CreationOptional<Date>
}

RagFile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    ragIndexId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rag_indices',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    pipelineStage: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
    error: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    numChunks: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    underscored: true,
    timestamps: true,
    sequelize,
  },
)

export default RagFile

export type RagFileAttributes = InferAttributes<RagFile>
