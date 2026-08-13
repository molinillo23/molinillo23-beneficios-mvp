const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  Business, Subscription, Plan, Corporate, Employee, User,
  Promotion, Redemption, ContentRequest, ContentItem, AnalyticsEvent,
} = require('../models');
const { generateContentPieces } = require('../services/aiContent');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

// GET /api/admin/overview  (métricas generales de la plataforma)
router.get('/overview', async (req, res) => {
  const [
    businessCount, activeSubscriptions, corporateCount,
    employeeCount, verifiedEmployeeCount, promotionCount, redemptionCount,
  ] = await Promise.all([
    Business.count(),
    Subscription.count({ where: { status: 'active' } }),
    Corporate.count(),
    Employee.count(),
    Employee.count({ where: { verified: true } }),
    Promotion.count({ where: { active: true } }),
    Redemption.count(),
  ]);

  res.json({
    businessCount,
    activeSubscriptions,
    corporateCount,
    employeeCount,
    verifiedEmployeeCount,
    promotionCount,
    redemptionCount,
  });
});

// GET /api/admin/businesses  (listado completo con su suscripción activa)
router.get('/businesses', async (req, res) => {
  const businesses = await Business.findAll({
    include: [{ model: Subscription, include: [Plan], where: { status: 'active' }, required: false }],
  });
  res.json(businesses);
});

// GET /api/admin/redemptions  (bitácora de canjes, más reciente primero)
router.get('/redemptions', async (req, res) => {
  const redemptions = await Redemption.findAll({
    include: [
      { model: Business, attributes: ['id', 'name'] },
      { model: Promotion, attributes: ['id', 'title', 'discountPercent'] },
      { model: Employee, attributes: ['id', 'corporateId'], include: [Corporate] },
    ],
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
  res.json(redemptions);
});

// GET /api/admin/content-requests  (cola de producción — brief mensual de todos los negocios)
router.get('/content-requests', async (req, res) => {
  const status = req.query.status;
  const where = status ? { status } : {};
  const requests = await ContentRequest.findAll({ where, include: [Business], order: [['createdAt', 'ASC']] });
  res.json(requests);
});

// PATCH /api/admin/content-requests/:id  (mover a in_production / in_review / approved / published)
router.patch('/content-requests/:id', async (req, res) => {
  const request = await ContentRequest.findByPk(req.params.id);
  if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });
  const { status } = req.body;
  const validStatuses = ['submitted', 'in_production', 'in_review', 'approved', 'published'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  await request.update({ status });
  res.json(request);
});
// POST /api/admin/content-requests/:id/generate  (dispara la IA sobre un brief mensual)
// Implementa "IA genera -> tu equipo revisa -> cliente aprueba -> sistema publica".
router.post('/content-requests/:id/generate', async (req, res) => {
  const request = await ContentRequest.findByPk(req.params.id, { include: [Business] });
  if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const promotions = await Promotion.findAll({ where: { businessId: request.businessId, active: true } });

  let pieces;
  try {
    pieces = await generateContentPieces({
      business: request.Business,
      contentRequest: request,
      promotions,
    });
  } catch (err) {
    return res.status(502).json({ error: `Error generando contenido: ${err.message}` });
  }

  // Reemplaza borradores previos de este brief (si se vuelve a generar)
  await ContentItem.destroy({ where: { contentRequestId: request.id, status: 'draft' } });

  const created = await Promise.all(
    Object.entries(pieces).map(([channel, text]) =>
      ContentItem.create({ contentRequestId: request.id, channel, text, status: 'draft' })
    )
  );

  await request.update({ status: 'in_review' });

  res.status(201).json(created);
});

// GET /api/admin/content-requests/:id/items  (piezas generadas para un brief)
router.get('/content-requests/:id/items', async (req, res) => {
  const items = await ContentItem.findAll({ where: { contentRequestId: req.params.id }, order: [['channel', 'ASC']] });
  res.json(items);
});

// PATCH /api/admin/content-items/:id  (editar texto antes de mandar a revisión del cliente)
router.patch('/content-items/:id', async (req, res) => {
  const item = await ContentItem.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Pieza de contenido no encontrada' });
  const { text } = req.body;
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Texto inválido' });
  await item.update({ text: text.trim() });
  res.json(item);
});

// GET /api/admin/employees  (listado completo, para verificar manualmente)
router.get('/employees', async (req, res) => {
  const employees = await Employee.findAll({
    include: [
      { model: User, attributes: ['id', 'email', 'name'] },
      Corporate,
    ],
    order: [['createdAt', 'DESC']],
  });
  res.json(employees);
});

module.exports = router;
