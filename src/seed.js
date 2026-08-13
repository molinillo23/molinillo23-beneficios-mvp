require('dotenv').config();
const { sequelize, Plan, User, Corporate } = require('./models');
const { hashPassword } = require('./utils/auth');

async function seed() {
  const plans = [
    { name: 'Presencia', priceMxn: 1750, description: 'Perfil + branding básico + landing page', features: JSON.stringify(['Perfil', 'Branding básico', 'Landing page', 'Marketplace']) },
    { name: 'Growth', priceMxn: 3000, description: 'Web + contenido mensual + promociones', features: JSON.stringify(['Web', '12 posts/mes', '8 historias', '4 videos cortos', '1 promoción mensual', 'Marketplace']) },
    { name: 'Pro', priceMxn: 5000, description: 'Web + redes + fotos + videos + campañas', features: JSON.stringify(['Web', 'Redes', 'Fotos/video editado', 'Campañas', 'Analítica']) },
    { name: 'Corporate+', priceMxn: 6500, description: 'Todo + producción ampliada + automatización + campañas segmentadas', features: JSON.stringify(['Todo lo anterior', 'Producción ampliada', 'Automatización', 'Campañas segmentadas', 'Prioridad']) },
  ];

  for (const p of plans) {
    const [plan] = await Plan.findOrCreate({ where: { name: p.name }, defaults: p });
    console.log(`Plan listo: ${plan.name} - $${plan.priceMxn}/mes`);
  }

  const corporates = [
    { name: 'Daimler', city: 'Saltillo' },
    { name: 'Magna', city: 'Ramos Arizpe' },
    { name: 'DeAcero', city: 'Saltillo' },
  ];
  for (const c of corporates) {
    const [corp] = await Corporate.findOrCreate({ where: { name: c.name }, defaults: c });
    console.log(`Corporativo listo: ${corp.name}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@plataforma.mx';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const [admin, created] = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: { passwordHash: hashPassword(adminPassword), role: 'admin', name: 'Admin' },
  });
  console.log(created ? `Admin creado: ${adminEmail} / ${adminPassword}` : `Admin ya existía: ${adminEmail}`);

  console.log('\nSeed completo.');
}

module.exports = seed;

// Si se ejecuta directamente (node src/seed.js), corre y termina el proceso.
if (require.main === module) {
  sequelize.sync()
    .then(seed)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
