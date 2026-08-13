const Anthropic = require('@anthropic-ai/sdk');

// Modelo configurable por variable de entorno (ANTHROPIC_MODEL). Por defecto
// usa Claude Sonnet 5: buen balance costo/calidad para copywriting por lote.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const CHANNELS = [
  'instagram_post',
  'instagram_story',
  'facebook',
  'tiktok_script',
  'google_business',
  'whatsapp',
  'corporate_offer',
];

// Construye el prompt con el brief del negocio + la carga mensual, y pide a
// Claude que devuelva SOLO JSON con una pieza de texto por canal. Esto
// implementa la sección 4 del documento: "una sola carga -> contenido para
// cada canal", con formato adaptado por plataforma (sección 6).
function buildPrompt({ business, contentRequest, promotions }) {
  const services = safeParseArray(business.requestedServices);
  const mediaCount = safeParseArray(contentRequest.mediaUrls).length;
  const activePromos = (promotions || [])
    .map((p) => `- ${p.title}${p.discountPercent ? ` (${p.discountPercent}%)` : ''}`)
    .join('\n') || 'Ninguna promoción corporativa activa registrada.';

  return `Eres el motor de producción de contenido de una plataforma de marketing administrado para negocios locales en México (corredor industrial Saltillo-Ramos Arizpe). Un negocio subió su material del mes; genera las piezas de contenido correspondientes.

NEGOCIO
Nombre: ${business.name}
Giro: ${business.giro || 'no especificado'}
Qué vende: ${business.whatItSells || 'no especificado'}
Ciudad: ${business.city || 'no especificada'}
Público objetivo: ${business.targetAudience || 'no especificado'}
Servicios contratados: ${services.join(', ') || 'no especificado'}

BRIEF DE ESTE MES (${contentRequest.monthTag})
Qué quiere promocionar: ${contentRequest.whatToPromote || 'no especificado'}
Detalles de la promoción: ${contentRequest.promotionDetails || 'ninguno'}
Novedades: ${contentRequest.whatsNew || 'ninguna'}
Objetivo: ${contentRequest.objective || 'no especificado'}
Material recibido: ${mediaCount} archivo(s) (fotos/video)

PROMOCIONES CORPORATIVAS ACTIVAS (para incluir CTA de tarjeta corporativa cuando aplique)
${activePromos}

INSTRUCCIONES POR CANAL (sección 6 del documento):
- instagram_post: imagen/copy corto + CTA.
- instagram_story: texto muy breve para una historia, tono inmediato.
- facebook: más información, precio si aplica, ubicación y promoción.
- tiktok_script: guion de 10-30 segundos con shots numerados y hook inicial.
- google_business: publicación directa con oferta/novedad.
- whatsapp: mensaje corto tipo difusión con llamada a la acción.
- corporate_offer: una línea dirigida a empleados corporativos, mencionando el descuento y cómo canjearlo con QR.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con esta forma exacta:
{
  "instagram_post": "...",
  "instagram_story": "...",
  "facebook": "...",
  "tiktok_script": "...",
  "google_business": "...",
  "whatsapp": "...",
  "corporate_offer": "..."
}`;
}

function safeParseArray(jsonString) {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
// Llama a Claude y devuelve { channel: text } validado contra CHANNELS.
async function generateContentPieces({ business, contentRequest, promotions }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Falta configurar ANTHROPIC_API_KEY en el archivo .env del backend.');
  }

  // El cliente se crea aquí (no al cargar el módulo) para que la app no truene
  // al arrancar si todavía no has puesto tu API key.
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = buildPrompt({ business, contentRequest, promotions });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('La IA no devolvió contenido de texto.');

  const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('La IA no devolvió un JSON válido. Intenta de nuevo.');
  }

  const pieces = {};
  for (const channel of CHANNELS) {
    if (typeof parsed[channel] === 'string' && parsed[channel].trim()) {
      pieces[channel] = parsed[channel].trim();
    }
  }
  if (Object.keys(pieces).length === 0) {
    throw new Error('La IA no generó ninguna pieza de contenido reconocible.');
  }
  return pieces;
}

module.exports = { generateContentPieces, buildPrompt, CHANNELS };
