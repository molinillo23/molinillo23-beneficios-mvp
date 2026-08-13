const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Campos del brief inicial descritos en el documento: giro, qué vende,
// ciudad, público objetivo, precios, promociones, fotos, logo, redes.
const Business = sequelize.define('Business', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  giro: { type: DataTypes.STRING }, // ej. restaurante, clínica, gimnasio
  whatItSells: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING },
  targetAudience: { type: DataTypes.TEXT },
  logoUrl: { type: DataTypes.STRING },
  socialLinks: { type: DataTypes.TEXT }, // JSON string {instagram, facebook, tiktok}
  currentWebsite: { type: DataTypes.STRING },
  mainObjective: {
    type: DataTypes.ENUM('mas_ventas', 'mas_seguidores', 'mas_visitas', 'lanzar_producto', 'clientes_nuevos'),
  },
  requestedServices: { type: DataTypes.TEXT }, // JSON string array: web, branding, fotos, videos, ig, fb, tiktok, google_ads
  status: {
    type: DataTypes.ENUM('onboarding', 'active', 'paused', 'cancelled'),
    defaultValue: 'onboarding',
  },
}, {
  tableName: 'businesses',
  timestamps: true,
});

module.exports = Business;
