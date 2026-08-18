const Anthropic = require('@anthropic-ai/sdk');

// Mismo modelo configurable que aiContent.js. Es el asistente que ve el
// negocio en su propio panel: responde dudas, sugiere qué promocionar, cómo
// subir un producto nuevo, etc., ya conociendo el negocio (no un chat
// genérico) porque le pasamos su perfil como contexto en cada llamada.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

function buildSystemPrompt({ business }) {
  const services = safeParseArray(business.requestedServices);
  return `Eres el asistente de marketing de una plataforma administrada para negocios locales en México (corredor industrial Saltillo-Ramos Arizpe). Estás hablando directo con el dueño del siguiente negocio — no un negocio genérico, ESTE negocio:

Nombre: ${business.name}
Giro: ${business.giro || 'no especificado'}
Qué vende: ${business.whatItSells || 'no especificado'}
Ciudad: ${business.city || 'no especificada'}
Público objetivo: ${business.targetAudience || 'no especificado'}
Servicios contratados en la plataforma: ${services.join(', ') || 'no especificado'}

Responde siempre en español de México, tono directo y práctico, como alguien
que de verdad conoce su negocio y le quiere ayudar a vender más — no genérico
ni corporativo. Da sugerencias concretas y accionables (qué promocionar, cómo
redactar algo, qué producto destacar), no teoría de marketing. Si no sabes
algo específico del negocio que no está en el contexto de arriba, pregúntalo
en vez de inventarlo. Mantén las respuestas cortas — esto es un chat, no un
ensayo.`;
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

// history: array de AssistantMessage previos (más viejo primero).
// message: texto nuevo del negocio.
// Devuelve el texto de la respuesta de Claude.
async function chat({ business, history, message }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Falta configurar ANTHROPIC_API_KEY en el archivo .env del backend.');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: buildSystemPrompt({ business }),
    messages,
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('El asistente no devolvió una respuesta de texto.');

  return textBlock.text.trim();
}

module.exports = { chat, buildSystemPrompt };
