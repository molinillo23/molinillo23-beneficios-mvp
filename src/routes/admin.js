const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  Business, Subscription, Plan, Corporate, Employee,
  Promotion, Redemption, ContentRequest, AnalyticsEvent,
} = require('../models');

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

module.exports = router;
