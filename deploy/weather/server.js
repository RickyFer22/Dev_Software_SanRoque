'use strict';

/**
 * Proxy mínimo de clima para el Portal de San Roque.
 *
 * El frontend hace GET /api/weather?lat=<num>&lon=<num> y espera el formato
 * de OpenWeatherMap (weather[0].icon/description, main.temp/humidity/feels_like/
 * pressure, wind.speed). Este servicio reenvía la consulta a OpenWeatherMap
 * agregando la API key, que NUNCA se expone al cliente (vive en .env del VPS).
 *
 * Sin dependencias externas: usa el http y fetch nativos de Node >= 20.
 */

const http = require('http');

const PORT = parseInt(process.env.PORT || '3000', 10);
const API_KEY = process.env.OWM_API_KEY || '';
const UNITS = process.env.OWM_UNITS || 'metric';
const LANG = process.env.OWM_LANG || 'es';
const CACHE_TTL_MS = parseInt(process.env.WEATHER_CACHE_TTL_MS || '600000', 10); // 10 min

// Cache en memoria por coordenada redondeada (evita pegarle a OWM en cada visita)
const cache = new Map();

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function validCoord(v, min, max) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

const server = http.createServer(async (req, res) => {
  // Healthcheck simple
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) {
    return sendJson(res, 200, { status: 'ok' });
  }

  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'GET' || url.pathname !== '/api/weather') {
    return sendJson(res, 404, { error: 'not found' });
  }

  if (!API_KEY) {
    return sendJson(res, 503, { error: 'weather not configured' });
  }

  const lat = validCoord(url.searchParams.get('lat'), -90, 90);
  const lon = validCoord(url.searchParams.get('lon'), -180, 180);
  if (lat === null || lon === null) {
    return sendJson(res, 400, { error: 'invalid coordinates' });
  }

  // Clave de cache con baja resolución (≈1km) para maximizar aciertos
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return sendJson(res, 200, hit.data);
  }

  try {
    const owm = new URL('https://api.openweathermap.org/data/2.5/weather');
    owm.searchParams.set('lat', String(lat));
    owm.searchParams.set('lon', String(lon));
    owm.searchParams.set('appid', API_KEY);
    owm.searchParams.set('units', UNITS);
    owm.searchParams.set('lang', LANG);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(owm, { signal: controller.signal });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return sendJson(res, 502, { error: 'weather upstream error' });
    }
    const data = await upstream.json();
    cache.set(key, { ts: Date.now(), data });
    return sendJson(res, 200, data);
  } catch (err) {
    return sendJson(res, 502, { error: 'weather fetch failed' });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[weather] escuchando en :${PORT} (units=${UNITS}, lang=${LANG})`);
});
