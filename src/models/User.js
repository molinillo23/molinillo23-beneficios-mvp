const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('business', 'employee', 'admin'),
    allowNull: false,
  },
  name: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM('active', 'suspended'),
    defaultValue: 'active',
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
