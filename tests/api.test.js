import test from 'node:test';
import assert from 'node:assert/strict';
import {validateQuery,searchCities,getWeather,condition} from '../src/api.js';
const response=(data,status=200)=>async()=>({ok:status===200,status,json:async()=>data});
test('valida y codifica búsquedas; rechaza entradas inválidas sin llamar la red',async()=>{
 assert.equal(validateQuery('  Ciudad de México  '),'Ciudad de México');
 for(const q of ['', 'A', '<script>', 'x'.repeat(81)]) await assert.rejects(searchCities(q,()=>{throw Error('No debe llamar la red');}),/Escribe una ciudad/);
 let url; await searchCities('México',async u=>{url=u;return {ok:true,status:200,json:async()=>({})};}); assert.match(url,/M%C3%A9xico/);
});
test('procesa clima válido y traduce condiciones',async()=>{
 const current={time:'2026-10-31T12:00',temperature_2m:18,relative_humidity_2m:60,apparent_temperature:17,weather_code:0,wind_speed_10m:5};
 const result=await getWeather({latitude:19,longitude:-99},response({current}));assert.equal(result.temperature_2m,18); assert.equal(condition(result.weather_code),'Cielo despejado');
});
test('controla vacíos, HTTP 429/503, desconexión, JSON inválido y datos incompletos',async()=>{
 assert.deepEqual(await searchCities('zzzzzz',response({})),[]);
 await assert.rejects(searchCities('Toluca',response({},429)),/Límite/);
 await assert.rejects(searchCities('Toluca',response({},503)),/503/);
 await assert.rejects(searchCities('Toluca',async()=>{throw new TypeError('offline');}),/conexión/);
 await assert.rejects(searchCities('Toluca',async()=>({ok:true,json:async()=>{throw Error();}})),/JSON/);
 await assert.rejects(getWeather({latitude:19,longitude:-99},response({current:{}})),/incompletos/);
 await assert.rejects(getWeather({latitude:100,longitude:0}),/coordenadas/);
});
