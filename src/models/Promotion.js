const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Promotion = sequelize.define('Promotion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  corporateId: { type: DataTypes.INTEGER, allowNull: true }, // null = aplica a todos los corporativos
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  discountPercent: { type: DataTypes.DECIMAL(5, 2) },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'promotions',
  timestamps: true,
});

module.exports = Promotion;
