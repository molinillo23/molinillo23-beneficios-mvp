const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Corporate = sequelize.define('Corporate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false }, // ej. Daimler, Magna, DeAcero
  domainOrCode: { type: DataTypes.STRING }, // dominio de correo o código para verificar empleados
  city: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'corporates',
  timestamps: true,
});

module.exports = Corporate;
