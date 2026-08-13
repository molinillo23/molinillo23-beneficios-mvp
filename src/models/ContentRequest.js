const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Representa el flujo mensual: "¿qué quieres promocionar?, sube fotos/videos,
// promoción, novedades, objetivo" descrito en la sección 3.3 del documento.
const ContentRequest = sequelize.define('ContentRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  monthTag: { type: DataTypes.STRING, allowNull: false }, // ej. '2026-08'
  whatToPromote: { type: DataTypes.TEXT },
  promotionDetails: { type: DataTypes.TEXT },
  whatsNew: { type: DataTypes.TEXT },
  objective: {
    type: DataTypes.ENUM('mas_ventas', 'mas_seguidores', 'mas_visitas', 'lanzar_producto', 'clientes_nuevos'),
  },
  mediaUrls: { type: DataTypes.TEXT }, // JSON string array de fotos/videos subidos
  status: {
    type: DataTypes.ENUM('submitted', 'in_production', 'in_review', 'approved', 'published'),
    defaultValue: 'submitted',
  },
}, {
  tableName: 'content_requests',
  timestamps: true,
});

module.exports = ContentRequest;
