require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/businesses');
const planRoutes = require('./routes/plans');
const promotionRoutes = require('./routes/promotions');
const redemptionRoutes = require('./routes/redemptions');
const corporateRoutes = require('./routes/corporates');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

const app = express();
app.use(cors());

// El webhook de Stripe necesita el body "crudo" (sin parsear) para poder
// verificar la firma, así que se registra ANTES de express.json() y con su
// propio parser (express.raw). Todo lo demás usa JSON normal.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/redemptions', redemptionRoutes);
app.use('/api/corporates', corporateRoutes);
app.use('/api/admin', adminRoutes);

// Sirve las fotos/videos generados por IA (src/services/aiImage.js escribe
// aquí). En Railway esto vive en el filesystem efímero del contenedor: si
// migras a multi-instancia o necesitas persistencia a largo plazo, cambia
// aiImage.js para subir a S3/Cloudinary en vez de disco local.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Sirve el Panel Negocio (index.html, app.js, styles.css) desde la raíz del
// proyecto, para que backend y frontend vivan en el mismo link.
app.use(express.static(path.join(__dirname, '..')));

// Sirve el Panel Admin en /admin (carpeta separada, mismo servidor).
app.use('/admin', express.static(path.join(__dirname, '..', 'panel-admin')));

// Sirve la App del Empleado en /empleado (carpeta separada, mismo servidor).
app.use('/empleado', express.static(path.join(__dirname, '..', 'panel-empleado')));

// Manejador de errores genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;

async function start() {
  await sequelize.sync({ alter: true }); // MVP: sync automático (agrega columnas nuevas si faltan). En producción usar migraciones.
  await require('./seed')(); // crea planes, corporativos y admin si no existen todavía
  app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
}

start();

module.exports = app;
