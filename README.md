# Plataforma de Beneficios Corporativos + Marketing IA — Backend MVP

Backend del MVP descrito en el documento maestro: negocios locales, corporativos,
empleados, promociones y canje medible por QR.

## Stack

- Node.js + Express
- Sequelize + SQLite (fácil de migrar a Postgres/Supabase: solo cambia
  `src/config/database.js`, el resto del código no cambia)
- Auth: JWT + bcrypt, con 3 roles: `business`, `employee`, `admin`

## Instalación

```bash
npm install
cp .env.example .env
npm run seed    # crea planes, 3 corporativos (Daimler, Magna, DeAcero) y admin
npm run dev     # levanta en http://localhost:3001
```

Admin de prueba: `admin@plataforma.mx` / `admin123`

## Estructura

```
src/
  config/database.js       conexión Sequelize
  models/                  User, Business, Plan, Subscription, Product,
                            ContentRequest, Corporate, Employee, Promotion,
                            Redemption, AnalyticsEvent
  middleware/auth.js        requireAuth, requireRole
  utils/auth.js             hash de password, firma/verificación JWT
  routes/
    auth.js                registro (negocio/empleado), login
    businesses.js           onboarding, brief, productos, brief mensual, dashboard
    plans.js                planes y suscripción
    promotions.js           crear/listar promociones (marketplace)
    redemptions.js          token QR dinámico + confirmación de canje
    corporates.js           corporativos, verificación de empleados
    admin.js                overview, cola de producción de contenido
  app.js                    servidor Express
  seed.js                   datos iniciales
```

## Flujo probado de extremo a extremo

1. `POST /api/auth/register/business` — negocio se registra
2. `POST /api/plans/subscribe` — elige plan (Presencia/Growth/Pro/Corporate+)
3. `POST /api/promotions` — crea promoción para un corporativo
4. `POST /api/auth/register/employee` — empleado se registra bajo un corporativo
5. `POST /api/redemptions/qr-token` — empleado genera QR dinámico (expira en 5 min,
   un solo uso — así se evita compartir capturas de pantalla, como recomienda
   el documento)
6. `POST /api/redemptions` — negocio escanea y confirma el canje, con monto de
   compra y descuento aplicado
7. `GET /api/businesses/me/dashboard` — el negocio ve venta atribuida, impresiones,
   QR abiertos, compras — la métrica que hace "brutalmente más vendible" la oferta
8. `GET /api/admin/overview` — panel admin con estado general de la plataforma

## Lo que falta para el MVP completo (según el documento maestro)

- **Producción de contenido con IA**: hoy `content_requests` solo guarda el brief
  mensual; falta conectar un modelo de IA que genere el contenido por canal
  (Instagram, TikTok, Facebook, Google Business) y el flujo de aprobación.
- **Frontend web**: 3 paneles (negocio, empleado, admin) — siguiente paso natural.
- **Sitio web automático** por negocio (sección 5 del documento).
- **Notificaciones, facturación/invoices, social_accounts, websites** — entidades
  mencionadas en el documento que no son críticas para validar el modelo comercial
  inicial y se agregan después del MVP.
- Migrar de SQLite a Postgres/Supabase cuando se pase a producción.
- Verificación real de empleados (dominio de correo corporativo o código de invitación)
  en lugar de aprobación manual por admin.

## Endpoints completos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | /api/auth/register/business | público | Registro de negocio |
| POST | /api/auth/register/employee | público | Registro de empleado |
| POST | /api/auth/login | público | Login |
| GET | /api/businesses | público | Marketplace de negocios activos |
| GET/PATCH | /api/businesses/me | business | Perfil propio |
| GET/POST | /api/businesses/me/products | business | Productos |
| GET/POST | /api/businesses/me/content-requests | business | Brief mensual |
| GET | /api/businesses/me/dashboard | business | Suscripción, promos, métricas |
| GET | /api/plans | público | Listado de planes |
| POST | /api/plans/subscribe | business | Suscribirse a un plan |
| GET | /api/promotions | público | Marketplace de promociones |
| POST | /api/promotions | business | Crear promoción |
| POST | /api/promotions/:id/view | público | Registrar vista (analítica) |
| POST | /api/redemptions/qr-token | employee | Generar QR dinámico |
| POST | /api/redemptions | business | Confirmar canje |
| GET | /api/corporates | público | Listado de corporativos |
| POST | /api/corporates | admin | Crear corporativo |
| PATCH | /api/corporates/employees/:id/verify | admin | Verificar empleado |
| GET | /api/corporates/employees/me | employee | Perfil propio |
| GET | /api/admin/overview | admin | Métricas generales |
| GET | /api/admin/businesses | admin | Todos los negocios |
| GET/PATCH | /api/admin/content-requests | admin | Cola de producción |
