const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Historial del asistente IA por negocio (Panel Negocio). Guarda cada turno
// de la conversación para que el negocio la vea completa al volver a entrar,
// y para que Claude tenga contexto de lo que ya se habló.
const AssistantMessage = sequelize.define('AssistantMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.ENUM('user', 'assistant'), allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'assistant_messages',
  timestamps: true,
});

module.exports = AssistantMessage;
