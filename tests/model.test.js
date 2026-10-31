import test from 'node:test';
import assert from 'node:assert/strict';
import {cityKey,readPreferences,savePreferences,uniqueCities,temperature,MAX_PLACES} from '../src/model.js';
const city={name:'Toluca',latitude:19.28,longitude:-99.65,admin1:'Estado de México',country:'México'};
test('fijadas se deduplican por coordenadas y respetan el límite',()=>{
 const places=Array.from({length:12},(_,i)=>({...city,latitude:19+i}));
 assert.equal(uniqueCities([city,{...city,name:'Otro nombre'},...places]).length,MAX_PLACES);
 assert.equal(uniqueCities([city,{...city,name:'Otro nombre'}]).length,1);
 assert.deepEqual(uniqueCities([null,{...city,latitude:200}]),[]);
});
test('recupera preferencias y cache únicamente de las fijadas; no conserva GPS',()=>{
 const weather={time:'2026-10-31T12:00',temperature_2m:20,relative_humidity_2m:40,apparent_temperature:19,weather_code:0,wind_speed_10m:5,daily:[],hourly:[]};
 const key=cityKey(city),other=cityKey({...city,latitude:20});
 const raw=savePreferences([city],[city],'F',{[key]:{weather,fetchedAt:Date.now()},[other]:{weather,fetchedAt:Date.now()}});
 const data=readPreferences(raw);assert.equal(data.unit,'F');assert.equal(data.favorites.length,1);assert.equal(data.cache[key].fromCache,true);assert.equal(data.cache[other],undefined);
 assert.deepEqual(readPreferences('{oops').favorites,[]);
 assert.equal(readPreferences(JSON.stringify({version:2,unit:'K'})).unit,'C');
});
test('no acepta cache roto o fechas futuras, convierte °F y preserva cero',()=>{
 const data=readPreferences(JSON.stringify({version:2,favorites:[city],cache:{[cityKey(city)]:{fetchedAt:Date.now()+999999,weather:{}}}}));assert.deepEqual(data.cache,{});
 assert.equal(temperature(0,'C'), '0°');assert.equal(temperature(0,'F',true),'32°F');assert.equal(temperature(null),'—');
});
