import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize'

import { sequelize } from '../connection'

class Discussion extends Model<InferAttributes<Discussion>, InferCreationAttributes<Discussion>> {
  declare id: CreationOptional<string>

  declare userId: string

  declare courseId: string

  declare response: string

  declare metadata: object
}

// docker exec -it 2b43f5dfb5c5 psql -U postgres
// drop table discussions;
// delete from "SequelizeMeta" where name = '20250121_00_init_discussion.ts';

Discussion.init(
  {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    response: {
      type: DataTypes.TEXT,
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

export default Discussion
