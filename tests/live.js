import assert from 'node:assert/strict';
import {searchCities,getWeather} from '../src/api.js';
import {writeFile} from 'node:fs/promises';
const results=[];
for(const query of ['Toluca','Madrid','zzzxxyyqqnoexiste']) {
 const start=Date.now();
 try {
  const cities=await searchCities(query);
  if(query==='zzzxxyyqqnoexiste') assert.equal(cities.length,0);
  else assert.ok(cities.length>0,'La ciudad debe existir');
  const city=cities[0];const weather=city?await getWeather(city):null;
  results.push({query,status:'PASS',city:city??null,weather,durationMs:Date.now()-start});
 } catch(e){results.push({query,status:'FAIL',error:e.message});}
}
await writeFile(new URL('../evidencias/consultas-reales.json',import.meta.url),JSON.stringify({executedAt:new Date().toISOString(),results},null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
