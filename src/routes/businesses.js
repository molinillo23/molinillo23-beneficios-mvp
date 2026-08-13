const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Business, Product, ContentRequest, Subscription, Plan, Promotion, AnalyticsEvent } = require('../models');

const router = express.Router();

// Helper: obtiene el Business del usuario autenticado (rol business)
async function getOwnBusiness(req, res) {
  const business = await Business.findOne({ where: { userId: req.user.id } });
  if (!business) {
    res.status(404).json({ error: 'Negocio no encontrado para este usuario' });
    return null;
  }
  return business;
}

// GET /api/businesses  (marketplace público — usado por la app de empleados)
router.get('/', async (req, res) => {
  const businesses = await Business.findAll({
    where: { status: 'active' },
    attributes: ['id', 'name', 'giro', 'city', 'logoUrl'],
  });
  res.json(businesses);
});

// GET /api/businesses/me  (perfil propio del negocio autenticado)
router.get('/me', requireAuth, requireRole('business'), async (req, res) => {
  const business = await getOwnBusiness(req, res);
  if (!business) return;
  res.json(business);
});

// PATCH /api/businesses/me  (completar/editar brief inicial)
const updateBusinessSchema = z.object({
  name: z.string().optional(),
  giro: z.string().optional(),
  whatItSells: z.string().optional(),
  city: z.string().optional(),
  targetAudience: z.string().optional(),
  logoUrl: z.string().optional(),
  socialLinks: z.record(z.string()).optional(), // {instagram, facebook, tiktok}
  currentWebsite: z.string().optional(),
  mainObjective: z.enum(['mas_ventas', 'mas_seguidores', 'mas_visitas', 'lanzar_producto', 'clientes_nuevos']).optional(),
  requestedServices: z.array(z.string()).optional(), // ['web','branding','fotos','videos','instagram','facebook','tiktok','google_ads']
});

router.patch('/me', requireAuth, requireRole('business'), async (req, res) => {
  const parsed = updateBusinessSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const business = await getOwnBusiness(req, res);
  if (!business) return;

  const data = { ...parsed.data };
  if (data.socialLinks) data.socialLinks = JSON.stringify(data.socialLinks);
  if (data.requestedServices) data.requestedServices = JSON.stringify(data.requestedServices);

  await business.update(data);
  res.json(business);
});

// --- Productos ---

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priceMxn: z.number().nonnegative().optional(),
  imageUrl: z.string().optional(),
});

router.get('/me/products', requireAuth, requireRole('business'), async (req, res) => {
  const business = await getOwnBusiness(req, res);
  if (!business) return;
  const products = await Product.findAll({ where: { businessId: business.id } });
  res.json(products);
});

router.post('/me/products', requireAuth, requireRole('business'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const business = await getOwnBusiness(req, res);
  if (!business) return;
  const product = await Product.create({ businessId: business.id, ...parsed.data });
  res.status(201).json(product);
});

// --- Solicitudes de contenido mensual (carga de material) ---

const contentRequestSchema = z.object({
  monthTag: z.string().min(1), // '2026-08'
  whatToPromote: z.string().optional(),
  promotionDetails: z.string().optional(),
  whatsNew: z.string().optional(),
  objective: z.enum(['mas_ventas', 'mas_seguidores', 'mas_visitas', 'lanzar_producto', 'clientes_nuevos']).optional(),
  mediaUrls: z.array(z.string()).optional(),
});

router.get('/me/content-requests', requireAuth, requireRole('business'), async (req, res) => {
  const business = await getOwnBusiness(req, res);
  if (!business) return;
  const requests = await ContentRequest.findAll({ where: { businessId: business.id }, order: [['createdAt', 'DESC']] });
  res.json(requests);
});

router.post('/me/content-requests', requireAuth, requireRole('business'), async (req, res) => {
  const parsed = contentRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const business = await getOwnBusiness(req, res);
  if (!business) return;

  const data = { ...parsed.data, businessId: business.id };
  if (data.mediaUrls) data.mediaUrls = JSON.stringify(data.mediaUrls);

  const request = await ContentRequest.create(data);
  res.status(201).json(request);
});

// --- Dashboard: suscripción, promociones y métricas propias ---

router.get('/me/dashboard', requireAuth, requireRole('business'), async (req, res) => {
  const business = await getOwnBusiness(req, res);
  if (!business) return;

  const subscription = await Subscription.findOne({
    where: { businessId: business.id, status: 'active' },
    include: [Plan],
    order: [['createdAt', 'DESC']],
  });
  const promotions = await Promotion.findAll({ where: { businessId: business.id } });
  const events = await AnalyticsEvent.findAll({ where: { businessId: business.id } });

  const metrics = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  res.json({ business, subscription, promotions, metrics });
});

module.exports = router;
