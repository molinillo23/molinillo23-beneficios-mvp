const express = require('express');
const { z } = require('zod');
const { User, Business, Employee, Corporate } = require('../models');
const { hashPassword, comparePassword, signToken } = require('../utils/auth');

const router = express.Router();

const registerBusinessSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1), // nombre del responsable
  businessName: z.string().min(1),
  giro: z.string().optional(),
  city: z.string().optional(),
});

const registerEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  corporateId: z.number().int(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register/business
router.post('/register/business', async (req, res) => {
  const parsed = registerBusinessSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, name, businessName, giro, city } = parsed.data;

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: 'El correo ya está registrado' });

  const user = await User.create({ email, passwordHash: hashPassword(password), name, role: 'business' });
  const business = await Business.create({ userId: user.id, name: businessName, giro, city, status: 'onboarding' });

  res.status(201).json({ token: signToken(user), user: { id: user.id, email, role: user.role }, business });
});

// POST /api/auth/register/employee
router.post('/register/employee', async (req, res) => {
  const parsed = registerEmployeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, name, corporateId } = parsed.data;

  const corporate = await Corporate.findByPk(corporateId);
  if (!corporate) return res.status(404).json({ error: 'Corporativo no encontrado' });

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: 'El correo ya está registrado' });

  const user = await User.create({ email, passwordHash: hashPassword(password), name, role: 'employee' });
  // MVP: verificación simple. En producción validar dominio de correo corporativo o código de invitación.
  const employee = await Employee.create({ userId: user.id, corporateId, verified: false });

  res.status(201).json({ token: signToken(user), user: { id: user.id, email, role: user.role }, employee });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const user = await User.findOne({ where: { email } });
  if (!user || !comparePassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

module.exports = router;
