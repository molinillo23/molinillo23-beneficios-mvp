const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  priceMxn: { type: DataTypes.DECIMAL(10, 2) },
  imageUrl: { type: DataTypes.STRING },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = Product;
