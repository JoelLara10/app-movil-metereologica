import test from 'node:test';
import assert from 'node:assert/strict';
import {getWeather,searchCities,weatherIcon} from '../src/api.js';
const current={time:'2026-10-31T10:15',temperature_2m:18,relative_humidity_2m:40,apparent_temperature:17,weather_code:3,wind_speed_10m:5};
test('normaliza el pronóstico y filtra las horas pasadas en la zona de la ciudad',async()=>{
 let url;
 const weather=await getWeather({latitude:19,longitude:-99},async value=>{url=value;return {ok:true,json:async()=>({current,hourly:{time:['2026-10-31T09:00','2026-10-31T10:00','2026-10-31T11:00'],temperature_2m:[16,18,19],weather_code:[3,3,2],precipitation_probability:[0,10,20]},daily:{time:['2026-10-31'],temperature_2m_min:[10],temperature_2m_max:[22],sunrise:['2026-10-31T06:40']}})}});
 assert.equal(weather.hourly.length,2);assert.equal(weather.hourly[0].temperature_2m,18);assert.equal(weather.hourly[1].precipitation_probability,20);assert.equal(weather.daily[0].temperature_2m_max,22);assert.match(url,/forecast_days=7/);assert.match(url,/temperature_unit=celsius/);
});
test('cancela búsquedas para no presentar resultados antiguos',async()=>{
 const controller=new AbortController();
 const request=searchCities('Toluca',async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const e=new Error();e.name='AbortError';reject(e);})),{signal:controller.signal});controller.abort();await assert.rejects(request,e=>e.name==='AbortError');
});
test('condiciones nocturnas y JSON nulo se tratan correctamente',async()=>{
 assert.equal(weatherIcon(0,false),'moon');assert.equal(weatherIcon(95),'thunderstorm');
 await assert.rejects(searchCities('Toluca',async()=>({ok:true,json:async()=>null})),/inválida/);
 await assert.rejects(getWeather({latitude:19,longitude:-99},async()=>({ok:true,json:async()=>null})),/incompletos/);
});
