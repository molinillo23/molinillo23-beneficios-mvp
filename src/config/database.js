const { Sequelize } = require('sequelize');
const path = require('path');

// SQLite para desarrollo local. Para producción, cambiar a Postgres/Supabase
// solo actualizando 'dialect' y las credenciales de conexión — el resto del
// código (modelos, rutas) no necesita cambios.
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', '..', 'database.sqlite'),
  logging: false,
});

module.exports = sequelize;
