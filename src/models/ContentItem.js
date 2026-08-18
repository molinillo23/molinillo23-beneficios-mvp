const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Una pieza de contenido generada por IA para un canal específico (ver
// src/services/aiContent.js) dentro de un ContentRequest (brief mensual).
// Ciclo: 'draft' (recién generada por Claude) -> el equipo la edita/aprueba
// -> 'approved' -> 'published' cuando se publica en el canal real.
const ContentItem = sequelize.define('ContentItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contentRequestId: { type: DataTypes.INTEGER, allowNull: false },
  channel: {
    type: DataTypes.ENUM(
      'instagram_post',
      'instagram_story',
      'facebook',
      'tiktok_script',
      'google_business',
      'whatsapp',
      'corporate_offer'
    ),
    allowNull: false,
  },
  text: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.ENUM('draft', 'approved', 'published'),
    defaultValue: 'draft',
  },
}, {
  tableName: 'content_items',
  timestamps: true,
});

module.exports = ContentItem;
