const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Corporate, Employee, User } = require('../models');

const router = express.Router();

// GET /api/corporates  (público, para el selector en el registro de empleado)
router.get('/', async (req, res) => {
  const corporates = await Corporate.findAll({ where: { status: 'active' } });
  res.json(corporates);
});

// POST /api/corporates  (solo admin)
const corporateSchema = z.object({
  name: z.string().min(1),
  domainOrCode: z.string().optional(),
  city: z.string().optional(),
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = corporateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const corporate = await Corporate.create(parsed.data);
  res.status(201).json(corporate);
});

// PATCH /api/corporates/employees/:id/verify  (admin verifica manualmente a un empleado — MVP)
router.patch('/employees/:id/verify', requireAuth, requireRole('admin'), async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });
  await employee.update({ verified: true });
  res.json(employee);
});

// GET /api/corporates/employees/me  (perfil del empleado autenticado)
router.get('/employees/me', requireAuth, requireRole('employee'), async (req, res) => {
  const employee = await Employee.findOne({ where: { userId: req.user.id }, include: [Corporate] });
  if (!employee) return res.status(404).json({ error: 'Perfil de empleado no encontrado' });
  res.json(employee);
});

module.exports = router;
