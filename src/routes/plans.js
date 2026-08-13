const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Plan, Subscription, Business } = require('../models');

const router = express.Router();

// GET /api/plans  (público)
router.get('/', async (req, res) => {
  const plans = await Plan.findAll();
  res.json(plans);
});

// POST /api/plans/subscribe  (negocio elige/cambia de plan)
const subscribeSchema = z.object({ planId: z.number().int() });

router.post('/subscribe', requireAuth, requireRole('business'), async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const business = await Business.findOne({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

  const plan = await Plan.findByPk(parsed.data.planId);
  if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

  // Cancela suscripción activa previa, si existe (MVP: un plan activo a la vez)
  await Subscription.update(
    { status: 'cancelled', endDate: new Date().toISOString().slice(0, 10) },
    { where: { businessId: business.id, status: 'active' } }
  );

  const subscription = await Subscription.create({
    businessId: business.id,
    planId: plan.id,
    status: 'active',
    startDate: new Date().toISOString().slice(0, 10),
  });

  await business.update({ status: 'active' });

  res.status(201).json(subscription);
});

module.exports = router;
