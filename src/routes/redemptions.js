const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Promotion, Employee, Redemption, AnalyticsEvent, Business } = require('../models');

const router = express.Router();

// POST /api/redemptions/qr-token  (empleado abre el QR: genera token temporal y registra "qr_open")
router.post('/qr-token', requireAuth, requireRole('employee'), async (req, res) => {
  const { promotionId } = req.body;
  const promotion = await Promotion.findByPk(promotionId);
  if (!promotion || !promotion.active) return res.status(404).json({ error: 'Promoción no encontrada o inactiva' });

  const employee = await Employee.findOne({ where: { userId: req.user.id } });
  if (!employee) return res.status(404).json({ error: 'Perfil de empleado no encontrado' });

  // Token dinámico y de un solo uso, vigente 5 minutos — evita compartir capturas de pantalla,
  // tal como recomienda el documento ("credencial digital dinámica").
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000;

  await AnalyticsEvent.create({ businessId: promotion.businessId, type: 'qr_open', meta: JSON.stringify({ promotionId }) });

  // MVP: el token se valida en memoria de la request de canje contra Redemption.redemptionToken (unique).
  res.json({ token, promotionId, employeeId: employee.id, expiresAt });
});

// POST /api/redemptions  (negocio escanea el QR y confirma el canje)
const redeemSchema = z.object({
  token: z.string().min(1),
  promotionId: z.number().int(),
  employeeId: z.number().int(),
  purchaseAmountMxn: z.number().nonnegative().optional(),
});

router.post('/', requireAuth, requireRole('business'), async (req, res) => {
  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { token, promotionId, employeeId, purchaseAmountMxn } = parsed.data;

  const promotion = await Promotion.findByPk(promotionId);
  if (!promotion || !promotion.active) return res.status(404).json({ error: 'Promoción no encontrada o inactiva' });

  const business = await Business.findOne({ where: { userId: req.user.id } });
  if (!business || business.id !== promotion.businessId) {
    return res.status(403).json({ error: 'Esta promoción no pertenece a tu negocio' });
  }

  const existingToken = await Redemption.findOne({ where: { redemptionToken: token } });
  if (existingToken) return res.status(409).json({ error: 'Este QR ya fue utilizado' });

  const discountAppliedMxn = purchaseAmountMxn && promotion.discountPercent
    ? Number((purchaseAmountMxn * (Number(promotion.discountPercent) / 100)).toFixed(2))
    : null;

  const redemption = await Redemption.create({
    promotionId,
    employeeId,
    businessId: business.id,
    purchaseAmountMxn: purchaseAmountMxn || null,
    discountAppliedMxn,
    redemptionToken: token,
  });

  await AnalyticsEvent.create({ businessId: business.id, type: 'purchase', meta: JSON.stringify({ promotionId, redemptionId: redemption.id }) });

  res.status(201).json(redemption);
});

module.exports = router;
