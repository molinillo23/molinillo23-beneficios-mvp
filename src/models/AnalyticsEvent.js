const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('impression', 'profile_view', 'qr_open', 'purchase'),
    allowNull: false,
  },
  meta: { type: DataTypes.TEXT }, // JSON string libre (canal, promoción, etc.)
}, {
  tableName: 'analytics_events',
  timestamps: true,
});

module.exports = AnalyticsEvent;
