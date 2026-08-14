const express = require('express');
const { Subscription, Business } = require('../models');

const router = express.Router();

// POST /api/webhooks/stripe
// Stripe llama a esta URL directamente (no el navegador del negocio) cuando
// ocurre un evento de pago. Requiere el body "crudo" (sin parsear a JSON)
// para poder verificar la firma — por eso se monta con express.raw() en
// app.js, ANTES del middleware global express.json().
router.post('/stripe', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe no está configurado en este servidor.');
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Firma de webhook inválida:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // El negocio completó el pago en la página de Stripe -> activamos su suscripción.
      case 'checkout.session.completed': {
        const session = event.data.object;
        const businessId = Number(session.metadata?.businessId);
        const planId = Number(session.metadata?.planId);
        if (businessId && planId) {
          await Subscription.update(
            { status: 'cancelled', endDate: new Date().toISOString().slice(0, 10) },
            { where: { businessId, status: 'active' } }
          );
          await Subscription.create({
            businessId,
            planId,
            status: 'active',
            startDate: new Date().toISOString().slice(0, 10),
            stripeSubscriptionId: session.subscription || null,
            stripeCustomerId: session.customer || null,
          });
          await Business.update({ status: 'active' }, { where: { id: businessId } });
        }
        break;
      }

      // Un pago recurrente falló -> marcamos la suscripción como atrasada.
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await Subscription.update(
            { status: 'past_due' },
            { where: { stripeSubscriptionId: invoice.subscription } }
          );
        }
        break;
      }

      // El negocio (o Stripe, tras reintentos fallidos) canceló la suscripción.
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await Subscription.update(
          { status: 'cancelled', endDate: new Date().toISOString().slice(0, 10) },
          { where: { stripeSubscriptionId: sub.id } }
        );
        break;
      }

      default:
        // Otros eventos de Stripe se ignoran a propósito en este MVP.
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error procesando webhook de Stripe:', err);
    res.status(500).json({ error: 'Error procesando el evento' });
  }
});

module.exports = router;
