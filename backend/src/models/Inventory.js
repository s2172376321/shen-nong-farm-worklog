const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: '個'
  },
  location: {
    type: String,
    required: true,
    default: '預設倉庫'
  },
  category: {
    type: String,
    required: true,
    default: '其他'
  },
  minimumStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    default: ''
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Inventory', inventorySchema); 