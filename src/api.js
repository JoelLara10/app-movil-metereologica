export function validateQuery(value) {
  const query = value.trim();
  if (query.length < 2 || query.length > 80 || !/^[\p{L}\p{N}\s.,'’\-]+$/u.test(query)) throw new Error('Escribe una ciudad de 2 a 80 caracteres, sin símbolos especiales.');
  return query;
}
export function condition(code) {
  if (code === 0) return 'Cielo despejado';
  if ([1,2].includes(code)) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if ([45,48].includes(code)) return 'Niebla';
  if (code >= 51 && code <= 67) return 'Lluvia o llovizna';
  if (code >= 71 && code <= 77) return 'Nieve';
  if (code >= 80 && code <= 86) return 'Chubascos';
  if (code >= 95 && code <= 99) return 'Tormenta';
  return 'Condición no disponible';
}
async function json(url, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetcher(url, { method: 'GET', signal: controller.signal });
    if (response.status === 429) throw new Error('Límite de solicitudes alcanzado. Espera un minuto antes de volver a intentar.');
    if (!response.ok) throw new Error(`El servicio no está disponible (HTTP ${response.status}). Intenta más tarde.`);
    try { return await response.json(); } catch { throw new Error('El servicio devolvió una respuesta JSON inválida.'); }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La consulta tardó demasiado. Revisa tu conexión e intenta otra vez.');
    if (error instanceof TypeError) throw new Error('No fue posible conectar. Revisa tu conexión a internet.');
    throw error;
  } finally { clearTimeout(timer); }
}
export async function searchCities(value, fetcher) {
  const query = validateQuery(value);
  const data = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=es&format=json`, fetcher);
  if (data.results === undefined) return [];
  if (!Array.isArray(data.results)) throw new Error('Respuesta de ubicaciones inválida.');
  return data.results.filter(x => typeof x.name === 'string' && Number.isFinite(x.latitude) && Number.isFinite(x.longitude));
}
export async function getWeather(city, fetcher) {
  if (!Number.isFinite(city.latitude) || Math.abs(city.latitude)>90 || !Number.isFinite(city.longitude) || Math.abs(city.longitude)>180) throw new Error('Las coordenadas no son válidas.');
  const data = await json(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`, fetcher);
  const c = data.current;
  if (!c || typeof c.time !== 'string' || !['temperature_2m','relative_humidity_2m','apparent_temperature','weather_code','wind_speed_10m'].every(k => Number.isFinite(c[k]))) throw new Error('El servicio devolvió datos meteorológicos incompletos.');
  return { ...c, timezone: data.timezone, units: data.current_units };
}
