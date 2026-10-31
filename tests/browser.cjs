const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/JOEL LARA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/JOEL LARA/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8177');
 for(const [query,name,file] of [['Toluca','Consultar Toluca de Lerdo, México','01-toluca'],['Madrid','Consultar Madrid, España','02-madrid']]){
 await page.waitForTimeout(1700);await page.getByRole('textbox',{name:'Ciudad',exact:true}).fill(query);
 await page.getByRole('button',{name:'Buscar',exact:true}).click();
 const item=page.getByText(query==='Toluca'?'Toluca de Lerdo':'Madrid',{exact:true}).last();await item.waitFor();await page.waitForTimeout(1700);await item.click();
 await page.getByText('CLIMA ACTUAL',{exact:true}).waitFor();await page.waitForTimeout(500);
 await page.screenshot({path:`evidencias/${file}.png`,fullPage:true});
 await page.waitForTimeout(1700);await page.getByRole('button',{name:/Actualizar clima/}).click();await page.waitForTimeout(2500);
 }
 await page.getByRole('textbox',{name:'Ciudad',exact:true}).fill('zzzxxyyqqnoexiste');await page.getByRole('button',{name:'Buscar',exact:true}).click();
 await page.getByText('No encontramos esa ciudad').waitFor();await page.screenshot({path:'evidencias/03-sin-resultados.png',fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: consulta Toluca/Madrid, actualizar y sin resultados. Sin errores JS.');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});



