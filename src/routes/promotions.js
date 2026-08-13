const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Promotion, Business, Corporate, AnalyticsEvent } = require('../models');

const router = express.Router();

const promotionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  corporateId: z.number().int().optional(), // omitir = aplica a todos los corporativos
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/promotions  (marketplace de empleados; filtra por corporativo opcional)
router.get('/', async (req, res) => {
  const { corporateId, businessId } = req.query;
  const where = { active: true };
  if (businessId) where.businessId = Number(businessId);

  let promotions = await Promotion.findAll({
    where,
    include: [{ model: Business, attributes: ['id', 'name', 'giro', 'city', 'logoUrl'] }, Corporate],
  });

  if (corporateId) {
    promotions = promotions.filter(
      (p) => p.corporateId === null || p.corporateId === Number(corporateId)
    );
  }

  res.json(promotions);
});

// POST /api/promotions  (negocio crea una promoción)
router.post('/', requireAuth, requireRole('business'), async (req, res) => {
  const parsed = promotionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const business = await Business.findOne({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

  const promotion = await Promotion.create({ businessId: business.id, ...parsed.data });
  res.status(201).json(promotion);
});

// POST /api/promotions/:id/view  (registra "visita al perfil" / vista de promoción — usado por la app de empleados)
router.post('/:id/view', async (req, res) => {
  const promotion = await Promotion.findByPk(req.params.id);
  if (!promotion) return res.status(404).json({ error: 'Promoción no encontrada' });
  await AnalyticsEvent.create({ businessId: promotion.businessId, type: 'profile_view', meta: JSON.stringify({ promotionId: promotion.id }) });
  res.json({ ok: true });
});

module.exports = router;
