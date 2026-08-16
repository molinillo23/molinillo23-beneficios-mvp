const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Fotos/videos generados por IA a partir de un ContentRequest (o sueltos,
// desde el Panel Negocio). Guarda el proveedor usado, el prompt, el estado
// del job y la URL final servida por /uploads. Ver src/services/aiImage.js
// para el generador de fotos con Gemini.
const MediaAsset = sequelize.define('MediaAsset', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  contentRequestId: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.ENUM('photo', 'video'), allowNull: false, defaultValue: 'photo' },
  provider: { type: DataTypes.STRING, allowNull: false, defaultValue: 'gemini' },
  prompt: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('queued', 'generating', 'completed', 'failed'),
    defaultValue: 'queued',
  },
  url: { type: DataTypes.STRING },
  costUsd: { type: DataTypes.DECIMAL(10, 4) },
  errorMessage: { type: DataTypes.TEXT },
}, {
  tableName: 'media_assets',
  timestamps: true,
});

module.exports = MediaAsset;
