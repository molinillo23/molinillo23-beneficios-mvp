const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  corporateId: { type: DataTypes.INTEGER, allowNull: false },
  employeeCode: { type: DataTypes.STRING }, // identificador no sensible, no CURP/nómina real
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'employees',
  timestamps: true,
});

module.exports = Employee;
