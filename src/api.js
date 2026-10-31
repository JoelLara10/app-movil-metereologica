const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
export function validateQuery(value) {
  const query = String(value ?? '').trim();
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
export function weatherIcon(code, isDay = true) {
  if (code === 0) return isDay ? 'sunny' : 'moon';
  if ([1,2].includes(code)) return isDay ? 'partly-sunny' : 'cloudy-night';
  if ([45,48].includes(code)) return 'cloud';
  if (code >= 95) return 'thunderstorm';
  if ((code >= 71 && code <= 77) || [85,86].includes(code)) return 'snow';
  if (code >= 51) return 'rainy';
  return 'cloudy';
}
async function json(url, fetcher = fetch, { signal } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetcher(url, { method: 'GET', signal: controller.signal });
    if (response.status === 429) {
      const error = new Error('Límite de solicitudes alcanzado. Espera un minuto antes de intentar de nuevo.');
      error.status = 429;
      throw error;
    }
    if (!response.ok) throw new Error(`El servicio no está disponible (HTTP ${response.status}). Intenta más tarde.`);
    try { return await response.json(); } catch { throw new Error('El servicio devolvió una respuesta JSON inválida.'); }
  } catch (error) {
    if (signal?.aborted) { const cancelled = new Error('Consulta cancelada'); cancelled.name = 'AbortError'; throw cancelled; }
    if (error.name === 'AbortError') throw new Error('La consulta tardó demasiado. Revisa tu conexión e intenta otra vez.');
    if (error instanceof TypeError) throw new Error('No fue posible conectar. Revisa tu conexión a internet.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export async function searchCities(value, fetcher, options) {
  const query = validateQuery(value);
  const data = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=7&language=es&format=json`, fetcher, options);
  if (!data || typeof data !== 'object') throw new Error('Respuesta de ubicaciones inválida.');
  if (data.results === undefined) return [];
  if (!Array.isArray(data.results)) throw new Error('Respuesta de ubicaciones inválida.');
  return data.results.filter(x => typeof x.name === 'string' && Number.isFinite(x.latitude) && Math.abs(x.latitude)<=90 && Number.isFinite(x.longitude) && Math.abs(x.longitude)<=180);
}
function series(data, fields) {
  if (!Array.isArray(data?.time)) return [];
  return data.time.map((time, index) => ({ time, ...Object.fromEntries(fields.map(field => [field, data[field]?.[index] ?? null])) }))
    .filter(item => typeof item.time === 'string');
}
export async function getWeather(city, fetcher, options) {
  if (!Number.isFinite(city.latitude) || Math.abs(city.latitude)>90 || !Number.isFinite(city.longitude) || Math.abs(city.longitude)>180) throw new Error('Las coordenadas no son válidas.');
  const current = 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day,precipitation,surface_pressure';
  const hourly = 'temperature_2m,weather_code,precipitation_probability,is_day';
  const daily = 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max';
  const data = await json(`${WEATHER_URL}?latitude=${city.latitude}&longitude=${city.longitude}&current=${current}&hourly=${hourly}&daily=${daily}&forecast_days=7&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh`, fetcher, options);
  const c = data?.current;
  if (!c || typeof c.time !== 'string' || !['temperature_2m','relative_humidity_2m','apparent_temperature','weather_code','wind_speed_10m'].every(k => Number.isFinite(c[k]))) throw new Error('El servicio devolvió datos meteorológicos incompletos.');
  return { ...c, timezone: data.timezone, units: data.current_units,
    hourly: series(data.hourly, hourly.split(',')).filter(item => item.time >= `${c.time.slice(0,13)}:00`).slice(0,24),
    daily: series(data.daily, daily.split(',')) };
}

