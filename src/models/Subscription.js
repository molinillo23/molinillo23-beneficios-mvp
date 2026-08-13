const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  planId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('trialing', 'active', 'past_due', 'cancelled'),
    defaultValue: 'active',
  },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY },
}, {
  tableName: 'subscriptions',
  timestamps: true,
});

module.exports = Subscription;
