const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Plan = sequelize.define('Plan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false }, // Presencia, Growth, Pro, Corporate+
  priceMxn: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT },
  features: { type: DataTypes.TEXT }, // JSON string array
  stripePriceId: { type: DataTypes.STRING }, // ID del "Price" configurado en Stripe (price_...)
  aiPhotosPerMonth: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // cuántas fotos IA puede generar el negocio al mes
}, {
  tableName: 'plans',
  timestamps: true,
});

module.exports = Plan;
