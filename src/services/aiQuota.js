const { Op } = require('sequelize');
const { MediaAsset, Subscription, Plan } = require('../models');

// Devuelve { allowed, used, limit } para fotos IA del negocio en el mes en
// curso, según el límite del plan activo (Plan.aiPhotosPerMonth). Si el
// negocio no tiene suscripción activa, el límite es 0 (no puede generar).
async function getPhotoQuota(businessId) {
  const subscription = await Subscription.findOne({
    where: { businessId, status: 'active' },
    include: [Plan],
    order: [['createdAt', 'DESC']],
  });
  const limit = subscription?.Plan?.aiPhotosPerMonth ?? 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await MediaAsset.count({
    where: {
      businessId,
      type: 'photo',
      status: 'completed',
      createdAt: { [Op.gte]: startOfMonth },
    },
  });

  return { allowed: used < limit, used, limit };
}

module.exports = { getPhotoQuota };
