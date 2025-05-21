import { QueryInterface, DataTypes } from 'sequelize'

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('rag_indices', 'filenames', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    comment: 'Original filenames of the files uploaded for this index',
  })
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn('rag_indices', 'filenames')
}
