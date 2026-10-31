const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.BRISA_URL||'http://127.0.0.1:8189';
const OUT=process.env.BRISA_EVIDENCE_DIR||path.join(__dirname,'../evidencias/v2');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const report={startedAt:new Date().toISOString(),gps:'Coordenadas simuladas de Ciudad de México para probar el permiso; clima real de Open-Meteo.',checks:[]};
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:19.4326,longitude:-99.1332},permissions:['geolocation']});
  const page=await context.newPage();page.setDefaultTimeout(40000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL);await page.getByText('CLIMA ACTUAL',{exact:true}).first().waitFor();report.checks.push('Ubicación inicial con permiso y clima real');
  await page.screenshot({path:path.join(OUT,'01-ubicacion.png')});
  const calls=[];page.on('request',r=>{if(r.url().includes('geocoding-api'))calls.push(r.url());});
  async function select(query,name){
   await page.getByRole('button',{name:'Abrir buscador de ciudades',exact:true}).click();
   await page.getByRole('textbox',{name:'Buscar ciudad',exact:true}).fill(query);
   const item=page.getByRole('button',{name,exact:true});await item.waitFor();
   if(query==='Toluca')await page.screenshot({path:path.join(OUT,'02-autocompletado.png')});
   await item.click();await page.getByRole('button',{name:`Fijar ${query==='Toluca'?'Toluca de Lerdo':'Madrid'}`,exact:true}).waitFor();
  }
  await select('Toluca','Ver clima de Toluca de Lerdo, México, Estado de México');
  await page.getByRole('button',{name:'Fijar Toluca de Lerdo',exact:true}).click();
  await page.getByRole('button',{name:'Quitar Toluca de Lerdo de fijadas',exact:true}).waitFor();
  await page.getByRole('button',{name:'Actualizar Toluca de Lerdo',exact:true}).waitFor();
  report.checks.push('Autocompletado sin pulsar Buscar; selección y fijado de Toluca');
  await select('Madrid','Ver clima de Madrid, España, Comunidad Autónoma de Madrid');
  await page.getByRole('button',{name:'Fijar Madrid',exact:true}).click();
  await page.getByRole('button',{name:'Actualizar Madrid',exact:true}).waitFor();
  await page.setViewportSize({width:390,height:1700});await page.waitForTimeout(600);
  await page.screenshot({path:path.join(OUT,'03-pronostico.png')});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
    const vertical=await page.evaluate(()=>{const button=document.querySelector('[aria-label="Actualizar Madrid"]');const scroll=Array.from(document.querySelectorAll('div')).find(el=>el.contains(button)&&el.scrollHeight>el.clientHeight+100&&['auto','scroll'].includes(getComputedStyle(el).overflowY));if(!scroll)return false;const title=Array.from(scroll.querySelectorAll('div')).find(el=>el.textContent==='Tu semana');scroll.scrollTop+=title.getBoundingClientRect().top-scroll.getBoundingClientRect().top-8;return true;});
  assert.ok(vertical,'El pronóstico debe permitir desplazamiento vertical');await page.waitForTimeout(500);await page.screenshot({path:path.join(OUT,'07-semana.png')});
  await page.evaluate(()=>{const button=document.querySelector('[aria-label="Actualizar Madrid"]');for(const el of document.querySelectorAll('div'))if(el.contains(button)&&['auto','scroll'].includes(getComputedStyle(el).overflowY))el.scrollTop=0;});
  report.checks.push('Madrid España, pronóstico de siete días y desplazamiento vertical');
  await page.getByRole('button',{name:'Cambiar a grados Fahrenheit',exact:true}).click();
  await page.getByRole('button',{name:'Cambiar a grados Celsius',exact:true}).waitFor();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('@brisa/preferences-v2')));assert.equal(stored.favorites.length,2);assert.equal(stored.unit,'F');assert.equal(Object.keys(stored.cache).length,2);assert.ok(!JSON.stringify(stored).includes('19.4326'));
  await page.reload();await page.getByRole('tab',{name:'Ver Madrid',exact:true}).waitFor();await page.getByRole('button',{name:'Cambiar a grados Celsius',exact:true}).waitFor();
  await page.getByRole('tab',{name:'Ver Toluca de Lerdo',exact:true}).click();await page.getByRole('button',{name:'Quitar Toluca de Lerdo de fijadas',exact:true}).waitFor();
  report.checks.push('Ciudades y °F persisten al recargar; GPS no se guarda');
  // React Native Web implements paging using CSS scroll snapping.
  const scrollers=await page.evaluate(()=>Array.from(document.querySelectorAll('div')).filter(el=>el.clientWidth>300&&el.scrollWidth>el.clientWidth*2&&getComputedStyle(el).overflowX==='auto').map(el=>({snap:getComputedStyle(el).scrollSnapType,w:el.clientWidth,scroll:el.scrollWidth})));
  const moved=await page.evaluate(()=>{const el=Array.from(document.querySelectorAll('div')).find(el=>el.clientWidth>300&&getComputedStyle(el).scrollSnapType.includes('mandatory')&&el.scrollWidth>=el.clientWidth*3);if(!el)return false;el.scrollLeft=el.clientWidth*2;return true;});
  assert.ok(moved,JSON.stringify(scrollers));await page.waitForTimeout(1300);
  assert.equal(await page.getByRole('tab',{name:'Ver Madrid',exact:true}).getAttribute('aria-selected'),'true');report.checks.push('Desplazamiento horizontal cambia la ciudad activa');
  await page.getByRole('button',{name:'Administrar ubicaciones fijadas',exact:true}).click();
  await page.getByRole('button',{name:'Mover Madrid antes',exact:true}).click();await page.waitForTimeout(500);
  const order=await page.evaluate(()=>JSON.parse(localStorage.getItem('@brisa/preferences-v2')).favorites.map(x=>x.name));assert.deepEqual(order,['Madrid','Toluca de Lerdo']);
  await page.screenshot({path:path.join(OUT,'04-fijadas.png')});
  await page.getByRole('button',{name:'Eliminar Toluca de Lerdo',exact:true}).click();await page.getByRole('button',{name:'Cerrar ubicaciones',exact:true}).click();
  assert.equal(await page.getByRole('tab',{name:'Ver Toluca de Lerdo',exact:true}).count(),0);report.checks.push('Reordenar y eliminar fijadas');
  await page.getByRole('button',{name:'Abrir buscador de ciudades',exact:true}).click();await page.getByRole('textbox',{name:'Buscar ciudad',exact:true}).fill('zzzxxyyqqnoexiste');await page.getByText('No encontramos esa ciudad',{exact:true}).waitFor();await page.getByRole('button',{name:'Cerrar búsqueda',exact:true}).click();report.checks.push('Búsqueda sin resultados');
  // Reload with only API requests blocked. This simulates a provider/network outage,
  // while still allowing the app itself to load from localhost.
  await context.route('**/api.open-meteo.com/**',route=>route.abort('internetdisconnected'));
  await page.reload();await page.getByRole('tab',{name:'Ver Madrid',exact:true}).waitFor();await page.getByRole('tab',{name:'Ver Madrid',exact:true}).click();
  await page.getByText('DATOS GUARDADOS',{exact:true}).waitFor();await page.getByText('Mostramos la última consulta guardada, no datos nuevos.',{exact:true}).first().waitFor();await page.screenshot({path:path.join(OUT,'05-sin-conexion.png')});report.checks.push('Recuperación de clima guardado al fallar la API');
  assert.deepEqual(errors,[]);await context.close();
  const denied=await browser.newContext({viewport:{width:390,height:844}});
  await denied.addInitScript(()=>Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_success,error)=>error({code:1})}}));
  const deniedPage=await denied.newPage();await deniedPage.goto(URL);await deniedPage.getByText('No se autorizó la ubicación. Puedes buscar una ciudad o permitirla en tu navegador.',{exact:true}).waitFor();await deniedPage.getByRole('button',{name:'Buscar una ciudad',exact:true}).waitFor();await deniedPage.screenshot({path:path.join(OUT,'06-permiso-denegado.png')});report.checks.push('Permiso denegado no bloquea la búsqueda manual');await denied.close();
  report.autocompleteCalls=calls.length;report.status='PASS';console.log(JSON.stringify(report,null,2));
 }catch(error){report.status='FAIL';report.error=error.stack;console.error(error);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(OUT,'verificacion-interfaz.json'),JSON.stringify(report,null,2));await browser.close();}
})();






