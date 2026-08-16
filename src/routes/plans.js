const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Plan, Subscription, Business, User } = require('../models');

const router = express.Router();

// GET /api/plans  (público)
router.get('/', async (req, res) => {
  const plans = await Plan.findAll();
  res.json(plans);
});

// POST /api/plans/subscribe  (asignación manual, sin cobro real — útil si un plan
// todavía no tiene su Price de Stripe configurado, o para pruebas internas)
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

// POST /api/plans/subscribe-checkout  (cobro real vía Stripe Checkout)
// Devuelve una URL de pago hospedada por Stripe; el negocio paga ahí, y Stripe
// nos avisa por webhook (ver routes/webhooks.js) cuando el pago se confirma.
router.post('/subscribe-checkout', requireAuth, requireRole('business'), async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'El cobro con tarjeta todavía no está configurado (falta STRIPE_SECRET_KEY).' });
  }

  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const business = await Business.findOne({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

  const plan = await Plan.findByPk(parsed.data.planId);
  if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
  if (!plan.stripePriceId) {
    return res.status(400).json({ error: `El plan "${plan.name}" todavía no tiene un precio configurado en Stripe.` });
  }

  const user = await User.findByPk(req.user.id);
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  const origin = req.headers.origin || `https://${req.headers.host}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
    metadata: { businessId: String(business.id), planId: String(plan.id) },
    subscription_data: {
      metadata: { businessId: String(business.id), planId: String(plan.id) },
    },
  });

  res.json({ url: session.url });
});

module.exports = router;
