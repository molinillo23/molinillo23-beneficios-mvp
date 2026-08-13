const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Cada canje es la unidad de medición que el documento describe como
// "brutalmente más vendible que 'te manejamos Instagram'": venta atribuida,
// descuento concedido, negocio, empleado y corporativo de origen.
const Redemption = sequelize.define('Redemption', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  promotionId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  purchaseAmountMxn: { type: DataTypes.DECIMAL(10, 2) },
  discountAppliedMxn: { type: DataTypes.DECIMAL(10, 2) },
  redemptionToken: { type: DataTypes.STRING, unique: true }, // token QR usado, para evitar reuso
  redeemedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'redemptions',
  timestamps: true,
});

module.exports = Redemption;
