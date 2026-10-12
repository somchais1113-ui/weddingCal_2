import { calculateElement } from './engine.js';
import { FabricRenderer } from './renderer.js';

const DEFAULT_MODEL={id:'fabric-01',type:'backdrop',inputs:{fabricWidth:150,fullnessRatio:2,dimensions:{backdropWidth:500,backdropHeight:250,spanDistance:400,sagDepth:80,numberOfSwags:3,calculationMethod:'brief'}},buffers:{seamBuffer:7,shrinkageBuffer:0,patternMatchBuffer:0,wastageBuffer:5},sceneParams:{color:'#d5e2f0'}};
const COLORS=[['#d5e2f0','ฟ้าหมอก'],['#ffffff','ขาว'],['#bac5d2','เทาเงิน'],['#b9cbbf','เขียวเซจ'],['#efcad1','ชมพู'],['#d7c3ef','ลาเวนเดอร์'],['#344c70','น้ำเงิน'],['#e7d9c8','แชมเปญ']];
const BUFFERS=[['seamBuffer','เผื่อตะเข็บ / เย็บ'],['shrinkageBuffer','เผื่อหดตัว'],['patternMatchBuffer','เผื่อจับคู่ลาย'],['wastageBuffer','เผื่อเสียหายหน้างาน']];
const $=id=>document.getElementById(id),clone=obj=>structuredClone(obj);
const stored=(key,def)=>{try{return JSON.parse(localStorage.getItem(key))??def;}catch{return def;}};
let model=stored('wfs-v2-static-draft',DEFAULT_MODEL),increment=stored('wfs-v2-static-increment',.5),history=stored('wfs-v2-static-history',[]),calculation=null;
const canvas=new FabricRenderer($('fabric-canvas'));
const pretty=n=>Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
function field(key,label,unit='ซม.',min=0.01,step=1,scope='dimensions'){
  const value=scope==='dimensions'?model.inputs.dimensions[key]:scope==='buffers'?model.buffers[key]:model.inputs[key];
  return `<label class="field"><span class="field-label">${label}</span><div class="input-wrap"><input type="number" data-scope="${scope}" data-name="${key}" min="${min}" step="${step}" value="${value}"/><span>${unit}</span></div></label>`;
}
function buildFields(){
 $('type-backdrop').classList.toggle('active',model.type==='backdrop');$('type-ceilingDrape').classList.toggle('active',model.type==='ceilingDrape');
 $('dimension-fields').innerHTML=model.type==='backdrop'?field('backdropWidth','ความกว้างฉาก')+field('backdropHeight','ความสูงฉาก'):
  field('spanDistance','ระยะต่อช่วง')+field('sagDepth','ความหย่อนกลาง','ซม.',0)+field('numberOfSwags','จำนวนช่วงหย่อน','ช่วง',1)+`<label class="field method-field"><span class="field-label">วิธีคำนวณความยาวโค้ง</span><select id="method-select"><option value="brief" ${model.inputs.dimensions.calculationMethod==='brief'?'selected':''}>สูตรประมาณตามบรีฟ (× 0.6)</option><option value="exact" ${model.inputs.dimensions.calculationMethod==='exact'?'selected':''}>Catenary ทางคณิตศาสตร์</option></select></label>`;
 $('buffer-fields').innerHTML=BUFFERS.map(([key,label])=>field(key,label,'%',0,1,'buffers')).join('');
 document.querySelector('[data-input="fabricWidth"]').value=model.inputs.fabricWidth;
 document.querySelector('[data-input="fullnessRatio"]').value=model.inputs.fullnessRatio;
 document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.preset)===model.inputs.fabricWidth));
}
function buildColors(){$('color-options').innerHTML=COLORS.map(([hex,label])=>`<button class="swatch ${model.sceneParams.color===hex?'active':''}" style="background:${hex}" title="${label}" aria-label="สีผ้า ${label}" data-color="${hex}"></button>`).join('');}
function row(label,value){return `<div class="detail-row"><span>${label}</span><strong>${value}</strong></div>`;}
function show(){
 try{
  calculation=calculateElement(model,increment);
  const r=calculation.result;
  $('error-notice').hidden=true;
  $('theory-value').textContent=pretty(r.theoreticalMeters);
  $('recommended-value').textContent=pretty(r.recommendedMeters);
  $('purchase-value').textContent=pretty(r.purchaseMeters);
  $('buffer-total').textContent=r.totalBufferPercent+'%';
  $('total-buffer-value').textContent=r.totalBufferPercent;
  $('purchase-increment-label').textContent=`ปัดขึ้นครั้งละ ${increment} เมตร`;
  $('dimension-summary').textContent=model.type==='backdrop'?`${model.inputs.dimensions.backdropWidth} × ${model.inputs.dimensions.backdropHeight} ซม.`:`${model.inputs.dimensions.spanDistance} ซม. × ${model.inputs.dimensions.numberOfSwags} ช่วง`;
  let details=row('ประเภทผ้า',model.type==='backdrop'?'ฉากหลัง (Backdrop Drape)':'ผ้าเพดาน (Ceiling Swag)');
  details+=row('หน้าผ้า / ความฟู',`${model.inputs.fabricWidth} ซม. / ${model.inputs.fullnessRatio} เท่า`);
  if(model.type==='backdrop'){
   details+=row('จำนวนแผ่นผ้า',`${r.panelCount} ผืน`)+row('ความยาวต่อผืน (ไม่รวมเผื่อ)',`${model.inputs.dimensions.backdropHeight} ซม.`);
  }else{
   details+=row('จำนวนช่วงหย่อน',`${r.numberOfSwags} ช่วง`)+row('ความยาวต่อช่วง',`${pretty(r.perSwagLength/100)} เมตร`)+row('สูตรประมาณ / Catenary จริง ต่อช่วง',`${pretty(r.approximatePerSwag/100)} / ${pretty(r.exactPerSwag/100)} ม.`);
  }
  details+=row('เผื่อเย็บ / หด / จับลาย / เสียหาย',Object.values(model.buffers).map(n=>n+'%').join(' / '));
  details+=row('ความยาวเผื่อเพิ่ม',`+${pretty(r.additionalLength/100)} เมตร`);
  details+=`<div class="detail-row"><span>ปัดยอดสั่งซื้อ</span><div class="increment-options">${[.5,1,5].map(n=>`<button data-increment="${n}" class="${increment===n?'selected':''}">${n} ม.</button>`).join('')}</div></div>`;
  $('detail-table').innerHTML=details;
  canvas.set(model,calculation);
 }catch(e){calculation=null;$('error-notice').hidden=false;$('error-notice').textContent='โปรดตรวจสอบตัวเลขที่กรอก: '+e.message;for(const id of ['theory-value','recommended-value','purchase-value'])$(id).textContent='—';$('detail-table').innerHTML='';}
 try{localStorage.setItem('wfs-v2-static-draft',JSON.stringify(model));localStorage.setItem('wfs-v2-static-increment',JSON.stringify(increment));}catch{}
}
function refresh(){buildFields();buildColors();show();}
const download=(name,text,mime)=>{const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),900);};
function exportFile(format){if(!calculation)return;const date=new Date().toISOString().slice(0,10);if(format==='json')download(`fabric-estimate-${date}.json`,JSON.stringify({...calculation,exportedAt:new Date().toISOString()},null,2),'application/json;charset=utf-8');else {const r=calculation.result;const csv='\uFEFFkey,value\r\n'+[['type',calculation.type],['theoretical_m',r.theoreticalMeters],['buffer_percent',r.totalBufferPercent],['recommended_m',r.recommendedMeters],['purchase_m',r.purchaseMeters],['panel_count',r.panelCount??''],['per_swag_m',r.perSwagLength?r.perSwagLength/100:'']].map(a=>a.join(',')).join('\r\n');download(`fabric-estimate-${date}.csv`,csv,'text/csv;charset=utf-8');}}
function renderHistory(){
 $('history-count').textContent=history.length;
 $('history-list').innerHTML=history.length?history.map(e=>`<div class="history-item"><div><b>${e.model.type==='backdrop'?'ฉากผ้า':'ผ้าเพดาน'} · ${pretty(e.purchaseMeters)} ม.</b><small>${new Date(e.savedAt).toLocaleString('th-TH')}</small></div><div class="history-buttons"><button data-load="${e.id}">เรียกคืน</button><button class="delete" data-delete="${e.id}">ลบ</button></div></div>`).join(''):'<div class="empty-history">ยังไม่มีรายการที่บันทึกไว้</div>';
 try{localStorage.setItem('wfs-v2-static-history',JSON.stringify(history));}catch{}
}
document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{model.type=b.dataset.type;refresh();}));
$('dimension-fields').addEventListener('input',e=>{if(e.target.dataset.scope==='dimensions'){model.inputs.dimensions[e.target.dataset.name]=Number(e.target.value);show();}});
$('dimension-fields').addEventListener('change',e=>{if(e.target.id==='method-select'){model.inputs.dimensions.calculationMethod=e.target.value;show();}});
$('buffer-fields').addEventListener('input',e=>{if(e.target.dataset.scope==='buffers'){model.buffers[e.target.dataset.name]=Number(e.target.value);show();}});
document.querySelectorAll('[data-input]').forEach(el=>el.addEventListener('input',()=>{model.inputs[el.dataset.input]=Number(el.value);document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.preset)===model.inputs.fabricWidth));show();}));
document.querySelectorAll('[data-preset]').forEach(el=>el.addEventListener('click',()=>{model.inputs.fabricWidth=Number(el.dataset.preset);refresh();}));
$('color-options').addEventListener('click',e=>{const color=e.target.dataset.color;if(color){model.sceneParams.color=color;buildColors();show();}});
$('detail-table').addEventListener('click',e=>{if(e.target.dataset.increment){increment=Number(e.target.dataset.increment);show();}});
$('reset-button').addEventListener('click',()=>{if(window.confirm('รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้น?')){model=clone(DEFAULT_MODEL);increment=.5;refresh();}});
$('buffer-toggle').addEventListener('click',()=>{$('buffer-fields').hidden=!$('buffer-fields').hidden;$('buffer-chevron').textContent=$('buffer-fields').hidden?'›':'⌄';});
$('save-button').addEventListener('click',()=>{if(!calculation)return;history.unshift({id:String(Date.now()),model:clone(model),increment,purchaseMeters:calculation.result.purchaseMeters,savedAt:new Date().toISOString()});history=history.slice(0,25);renderHistory();$('save-button').textContent='✓ บันทึกแล้ว';setTimeout(()=>$('save-button').textContent='▢ บันทึกการคำนวณ',1600);});
$('export-csv').addEventListener('click',()=>exportFile('csv'));$('export-json').addEventListener('click',()=>exportFile('json'));
$('history-button').addEventListener('click',()=>{$('history-overlay').hidden=false;renderHistory();});
$('history-close').addEventListener('click',()=>{$('history-overlay').hidden=true;});
$('history-overlay').addEventListener('click',e=>{if(e.target===$('history-overlay'))$('history-overlay').hidden=true;});
$('history-list').addEventListener('click',e=>{const id=e.target.dataset.load??e.target.dataset.delete;if(!id)return;const record=history.find(r=>r.id===id);if(e.target.dataset.load&&record){model=clone(record.model);increment=record.increment;refresh();$('history-overlay').hidden=true;}else if(e.target.dataset.delete){history=history.filter(r=>r.id!==id);renderHistory();}});
window.addEventListener('error',e=>{if(e.message&&e.filename?.endsWith('renderer.js')){$('canvas-error').hidden=false;}});
refresh();renderHistory();
