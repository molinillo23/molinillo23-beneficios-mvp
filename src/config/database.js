const { Sequelize } = require('sequelize');
const path = require('path');

// En Railway (producción) usamos Postgres vía DATABASE_URL, inyectada
// automáticamente al agregar el plugin de PostgreSQL. En desarrollo local,
// sin esa variable, seguimos usando SQLite para no requerir instalar nada.
let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
    logging: false,
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', '..', 'database.sqlite'),
    logging: false,
  });
}

module.exports = sequelize;
