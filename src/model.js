export const MAX_PLACES = 8;
export const STORAGE_KEY = '@brisa/preferences-v2';
export function cityKey(city) { return `${city.latitude.toFixed(4)},${city.longitude.toFixed(4)}`; }
export function cleanCity(city) {
  if (!city || typeof city.name !== 'string' || !city.name.trim() || !Number.isFinite(city.latitude) || Math.abs(city.latitude)>90 || !Number.isFinite(city.longitude) || Math.abs(city.longitude)>180) return null;
  return { name: city.name.slice(0,100), latitude: city.latitude, longitude: city.longitude,
    admin1: typeof city.admin1 === 'string' ? city.admin1.slice(0,100) : '', country: typeof city.country === 'string' ? city.country.slice(0,100) : '' };
}
export function uniqueCities(cities, max = MAX_PLACES) {
  const seen = new Set();
  return (Array.isArray(cities) ? cities : []).map(cleanCity).filter(city => {
    if (!city || seen.has(cityKey(city))) return false;
    seen.add(cityKey(city)); return true;
  }).slice(0,max);
}
export function readPreferences(raw) {
  const empty = { favorites: [], recent: [], unit: 'C', cache: {} };
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 2) return empty;
    const favorites = uniqueCities(data.favorites);
    const cache = {};
    for (const city of favorites) {
      const key=cityKey(city), entry=data.cache?.[key], w=entry?.weather;
      if (Number.isFinite(entry?.fetchedAt) && entry.fetchedAt>0 && entry.fetchedAt<=Date.now()+60000 && w && typeof w.time==='string' && ['temperature_2m','relative_humidity_2m','apparent_temperature','weather_code','wind_speed_10m'].every(k=>Number.isFinite(w[k]))) {
        cache[key]={fetchedAt:entry.fetchedAt,weather:{...w,hourly:Array.isArray(w.hourly)?w.hourly.filter(x=>x&&typeof x.time==='string').slice(0,24):[],daily:Array.isArray(w.daily)?w.daily.filter(x=>x&&typeof x.time==='string').slice(0,7):[]},fromCache:true};
      }
    }
    return {favorites,recent:uniqueCities(data.recent,4),unit:data.unit==='F'?'F':'C',cache};
  } catch { return empty; }
}
export function savePreferences(favorites, recent, unit, entries) {
  const cache={};
  for(const city of favorites) { const key=cityKey(city); if(entries[key]) cache[key]={fetchedAt:entries[key].fetchedAt,weather:entries[key].weather}; }
  return JSON.stringify({version:2,favorites:uniqueCities(favorites),recent:uniqueCities(recent,4),unit:unit==='F'?'F':'C',cache});
}
export function temperature(value, unit = 'C', withUnit = false) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(unit === 'F' ? value * 9 / 5 + 32 : value)}°${withUnit ? unit : ''}`;
}
export function region(city) { return [city?.admin1,city?.country].filter(Boolean).join(' · '); }
export function dayLabel(date, index) {
  if(index===0) return 'Hoy';
  if(index===1) return 'Mañana';
  const day = new Date(`${date}T12:00:00`);
  return Number.isNaN(day.getTime()) ? date : day.toLocaleDateString('es-MX',{weekday:'short'}).replace('.','');
}
