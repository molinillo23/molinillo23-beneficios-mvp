require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/businesses');
const planRoutes = require('./routes/plans');
const promotionRoutes = require('./routes/promotions');
const redemptionRoutes = require('./routes/redemptions');
const corporateRoutes = require('./routes/corporates');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/redemptions', redemptionRoutes);
app.use('/api/corporates', corporateRoutes);
app.use('/api/admin', adminRoutes);

// Manejador de errores genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;

async function start() {
  await sequelize.sync(); // MVP: sync automático. En producción usar migraciones.
  app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
}

start();

module.exports = app;
