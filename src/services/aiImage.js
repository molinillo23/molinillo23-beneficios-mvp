const fs = require('fs');
const path = require('path');

// Modelo de imagen de Gemini (Nano Banana). Configurable por env por si
// Google cambia el nombre del modelo o quieres probar otro tier.
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'generated');

function ensureUploadsDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Arma el prompt con el contexto del negocio (giro, qué vende) + lo que pidió
// el negocio en su brief, para que la foto salga en su estilo/rubro.
function buildImagePrompt({ business, description }) {
  return `Foto de marketing profesional para un negocio local en México.
Giro del negocio: ${business.giro || 'no especificado'}
Qué vende: ${business.whatItSells || 'no especificado'}
Estilo: fotografía comercial limpia, buena iluminación, composición lista para
publicar en redes sociales, SIN texto superpuesto ni logos falsos.
Lo que debe mostrar la imagen: ${description}`;
}

// Llama a la API de Gemini, guarda el binario resultante en /uploads/generated
// y devuelve la URL relativa (servida como estática por src/app.js) + un
// costo estimado en USD para llevar el registro de gasto por negocio.
async function generatePhoto({ business, description }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Falta configurar GEMINI_API_KEY en el archivo .env del backend.');
  }
  ensureUploadsDir();

  const prompt = buildImagePrompt({ business, description });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini respondió ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData && p.inlineData.data);
  if (!imagePart) {
    throw new Error('Gemini no devolvió ninguna imagen (puede haber bloqueado el prompt).');
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const ext = imagePart.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
  const filename = `biz${business.id}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

  return {
    url: `/uploads/generated/${filename}`,
    // Costo aproximado por imagen a resolución estándar (ago 2026). Ajustable
    // por env sin tocar código si Google cambia precios.
    costUsd: Number(process.env.GEMINI_IMAGE_COST_USD || 0.04),
  };
}

module.exports = { generatePhoto, buildImagePrompt };
