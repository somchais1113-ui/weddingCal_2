/** Real browser acceptance suite. Does not substitute mocks or fabricated screenshots. */
import {mkdir,writeFile,access,readFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createServer} from '../scripts/serve.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'qa');await mkdir(out,{recursive:true});
const report={timestamp:new Date().toISOString(),status:'not-run',checks:[],screenshots:[],errors:[]};let browser,server;
async function finish(){await writeFile(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));}
let chromium;
try{const module=process.env.WFS_PLAYWRIGHT_MODULE?await import(process.env.WFS_PLAYWRIGHT_MODULE):await import('playwright');chromium=module.chromium;await access(chromium.executablePath());}catch(err){report.status='blocked';report.errors.push('Playwright Chromium is unavailable. Install dev dependencies and run npx playwright install chromium.');report.detail=err.message;await finish();console.error(report.errors[0]);process.exit(2);}
if(process.argv.includes('--preflight')){report.status='ready-not-run';await finish();console.log('Browser preflight ready; no acceptance tests executed.');process.exit(0);}
async function check(name,fn){try{await fn();report.checks.push({name,status:'passed'});console.log('PASS '+name);}catch(err){report.checks.push({name,status:'failed',error:err.message});throw err;}}
try{
 server=createServer(path.join(root,'dist'));await new Promise(res=>server.listen(0,'127.0.0.1',res));const url=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1536,height:1000},deviceScaleFactor:1,acceptDownloads:true});const page=await context.newPage();const jsErrors=[],failedAssets=[];
 page.on('pageerror',e=>jsErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)failedAssets.push(r.url()+' '+r.status());});
 await page.goto(url);await page.waitForFunction(()=>document.getElementById('sum-cost').textContent.startsWith('฿'));
 await check('desktop UI loaded without asset or JS errors',async()=>{assert.equal(jsErrors.length,0);assert.equal(failedAssets.length,0);assert.ok(await page.locator('#preview').isVisible());assert.ok((await page.locator('#preview').boundingBox()).width>600);});
 await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});report.screenshots.push('desktop.png');
 await check('property change updates BOM, undo and redo restore values',async()=>{const before=await page.locator('#sum-purchase').textContent();await page.locator('[data-layer="heightCm"]').fill('350');await page.locator('[data-layer="heightCm"]').press('Tab');await page.waitForFunction(v=>document.getElementById('sum-purchase').textContent!==v,before);await page.locator('#undo').click();await page.waitForFunction(v=>document.getElementById('sum-purchase').textContent===v,before);await page.locator('#redo').click();await page.waitForFunction(v=>document.getElementById('sum-purchase').textContent!==v,before);});
 const truth=JSON.parse(await readFile(path.join(root,'examples/calibration-ground-truth.json')));
 for(const kind of ['front','oblique']){
  await check(`upload ${kind} image and calibrate four known corners`,async()=>{
   await page.locator('[data-tab="reference"]').click();await page.locator('#reference-file').setInputFiles(path.join(root,`examples/reference-${kind}.png`));await page.waitForFunction(()=>document.getElementById('reference-status').textContent.includes('เลือก 4 มุม'));
   const b=await page.locator('#reference-canvas').boundingBox(),iw=kind==='front'?1400:1600,ih=kind==='front'?756:1000,scale=Math.min((b.width-36)/iw,(b.height-75)/ih),w=iw*scale,h=ih*scale,x=b.x+(b.width-w)/2,y=b.y+(b.height-h)/2+9;
   const q=kind==='front'?[{x:.0001,y:.0001},{x:.9999,y:.0001},{x:.9999,y:.9999},{x:.0001,y:.9999}]:truth.quad;
   for(const p of q)await page.mouse.click(x+p.x*w,y+p.y*h);
   await page.locator('#calibrate-apply').click();await page.waitForFunction(()=>document.getElementById('reference-status').textContent.includes('ปรับระนาบแล้ว'));
  });
 }
 await check('trace layer creation and pointer edit persist',async()=>{
  const before=await page.locator('.layer-row').count();await page.locator('#trace-new').click();assert.equal(await page.locator('.layer-row').count(),before+1);
  const b=await page.locator('#reference-canvas').boundingBox(),s=Math.min((b.width-36)/500,(b.height-75)/270),w=s*500,h=s*270,x=b.x+(b.width-w)/2,y=b.y+(b.height-h)/2+9;
  await page.mouse.move(x+.05*w,y+.08*h);await page.mouse.down();await page.mouse.move(x+.12*w,y+.16*h,{steps:8});await page.mouse.up();
  await page.waitForFunction(()=>document.getElementById('save-status').textContent.includes('บันทึกในเครื่องแล้ว'));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#save-project').click()]);const json=JSON.parse(await readFile(await download.path()));const trace=json.layers.at(-1);assert.ok(Math.abs(trace.anchors.top[0].x-.12)<.03);assert.equal(json.reference.calibrated,true);
  await page.reload();await page.waitForFunction(()=>document.getElementById('save-status').textContent.includes('บันทึกในเครื่องแล้ว'));assert.equal(await page.locator('.layer-row').count(),before+1);
 });
 await check('lock prevents keyboard movement, duplicate and layer order work',async()=>{
  await page.locator('[data-tab="design"]').click();const selected=page.locator('.layer-row.selected');await selected.locator('[data-action="locked"]').click();assert.equal(await page.locator('[data-layer="x"]').isDisabled(),true);await selected.locator('[data-action="locked"]').click();const before=await page.locator('.layer-row').count();await page.locator('#duplicate-layer').click();assert.equal(await page.locator('.layer-row').count(),before+1);await page.locator('.layer-row.selected [data-action="up"]').click();
 });
 await check('all exports produce real files',async()=>{
  for(const [button,type] of [['#save-project','json'],['#export-png','png'],['#export-bom','csv']]){if(button==='#export-bom')await page.locator('[data-panel="bom"]').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator(button).click()]);const bytes=await readFile(await download.path());assert.ok(bytes.length>50);if(type==='png')assert.equal(bytes.subarray(1,4).toString(),'PNG');}
  await page.locator('[data-panel="steel"]').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-cut').click()]);assert.ok((await readFile(await download.path(),'utf8')).includes('Kerf'));
 });
 await check('saved JSON reimports through file picker',async()=>{await page.locator('#project-file').setInputFiles(path.join(root,'examples/traced-project.json'));await page.waitForFunction(()=>document.getElementById('project-name').value.startsWith('ตัวอย่างถอดแบบ'));assert.equal(await page.locator('.layer-row').count(),2);});
 await page.locator('[data-tab="compare"]').click();await page.screenshot({path:path.join(out,'reference-comparison.png'),fullPage:true});report.screenshots.push('reference-comparison.png');
 for(const [name,width,height] of [['tablet',820,1180],['android-s22',360,780],['fold5',768,1024]]){
  await check(`${name}: responsive layout and controls`,async()=>{await page.setViewportSize({width,height});await page.locator('[data-tab="design"]').click();await page.waitForFunction(()=>document.getElementById('preview').width>0);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);assert.ok(await page.locator('#preview').isVisible());await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});report.screenshots.push(name+'.png');});
 }
 await check('no critical JavaScript errors after all workflows',async()=>{assert.deepEqual(jsErrors,[]);assert.deepEqual(failedAssets,[]);});report.status='passed';
}catch(err){report.status='failed';report.errors.push(err.message);process.exitCode=1;}finally{await browser?.close();if(server)await new Promise(res=>server.close(res));await finish();}
