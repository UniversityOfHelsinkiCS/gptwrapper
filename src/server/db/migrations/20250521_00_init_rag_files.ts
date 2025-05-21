import { DataTypes } from 'sequelize'

import { Migration } from '../connection'

export const up: Migration = ({ context: queryInterface }) =>
  queryInterface.createTable('rag_files', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    rag_index_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rag_indices',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    pipeline_stage: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Stage of the ingestion pipeline',
    },
    error: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Error message if any error occurred during the ingestion pipeline',
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the uploaded file',
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of the uploaded file (e.g., pdf, md, text)',
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Number of characters in the file after text extraction',
    },
    num_chunks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Number of chunks created from the file',
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'ID of the user who uploaded the file',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  })

export const down: Migration = ({ context: queryInterface }) => queryInterface.dropTable('rag_files')
