const { DataTypes } = require('sequelize');
const db = require('../config/database');

const WorkLog = db.define('WorkLog', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  location_code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  position_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  work_category_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT
  },
  harvest_quantity: {
    type: DataTypes.DECIMAL(10, 2)
  },
  product_name: {
    type: DataTypes.STRING
  },
  product_quantity: {
    type: DataTypes.DECIMAL(10, 2)
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  reviewer_id: {
    type: DataTypes.UUID
  },
  reviewed_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'work_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = WorkLog; 