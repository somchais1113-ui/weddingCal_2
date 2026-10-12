import {DEFAULT_PROJECT,PALETTE,calculateProject,estimatedImageRegion} from './project.js';
import {LayeredRenderer} from './renderer.js';

const $=id=>document.getElementById(id);
const clone=object=>structuredClone(object);
const money=n=>Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const meters=n=>Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const number=(v,defaultValue=0)=>Number.isFinite(Number(v))?Number(v):defaultValue;
const stored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const STORAGE_KEY='wfs-v3-project';
let project=stored(STORAGE_KEY,clone(DEFAULT_PROJECT));
try{calculateProject(project);}catch{project=clone(DEFAULT_PROJECT);}
let selectedId=project.layers[0].id,calculation=null,view='3d';
let refImage=null,refImageData='',draftRegion=null,refTool='rect',pointerStart=null,refViewport=null,draggingRef=false;
const renderer=new LayeredRenderer($('design-canvas'));
const bufferLabels=[['seamBuffer','ตะเข็บและการเย็บ'],['shrinkageBuffer','การหดตัวของผ้า'],['patternMatchBuffer','การจับคู่ลาย'],['wastageBuffer','เสียหาย / หน้างาน']];
const layer=()=>project.layers.find(l=>l.id===selectedId)??project.layers[0];
const nfield=(key,label,unit='ซม.',step=1,min=0.01)=>`<label class="form-field"><span>${label}</span><div class="unit-input"><input type="number" data-layer="${key}" min="${min}" step="${step}" value="${safe(layer()[key])}"><b>${unit}</b></div></label>`;
function buildConfig(){
  $('project-name').value=project.name||'';
  $('mode-backdrop').classList.toggle('active',project.type==='backdrop');
  $('mode-ceiling').classList.toggle('active',project.type==='ceilingDrape');
  const l=layer();$('selected-number').textContent=`LAYER ${String(project.layers.indexOf(l)+1).padStart(2,'0')}`;
  $('layer-name').value=l.name;
  $('dynamic-dimensions').innerHTML=project.type==='backdrop'?nfield('widthCm','กว้างของ Layer')+nfield('heightCm','สูงของ Layer'):
    nfield('spanCm','ระยะต่อช่วง')+nfield('sagCm','ระยะหย่อน','ซม.',1,0)+nfield('swags','จำนวนช่วง','ช่วง',1,1)+`<label class="form-field"><span>วิธีคำนวณ</span><select id="ceiling-method"><option value="brief" ${l.method==='brief'?'selected':''}>สูตรตามบรีฟ</option><option value="exact" ${l.method==='exact'?'selected':''}>Catenary จริง</option></select></label>`;
  document.querySelectorAll('[data-layer]').forEach(input=>{
    if(input.dataset.layer==='name')return;
    input.value=l[input.dataset.layer]??0;
  });
  $('layer-opacity').value=l.opacity;
  $('opacity-label').textContent=l.opacity+'%';
  $('layer-color').value=/^#[0-9a-f]{6}$/i.test(l.color)?l.color:'#ffffff';
  $('color-palette').innerHTML=PALETTE.map(([hex,label])=>`<button class="swatch ${hex===l.color?'active':''}" style="background:${hex}" data-palette="${hex}" title="${safe(label)}" aria-label="${safe(label)}"></button>`).join('');
  $('buffer-fields').innerHTML=bufferLabels.map(([key,label])=>`<label class="form-field"><span>${label}</span><div class="unit-input"><input type="number" data-buffer="${key}" value="${safe(project.buffers[key])}" min="0" max="100" step="1"><b>%</b></div></label>`).join('');
  $('increment').value=String(project.increment);
  $('labor-cost').value=project.laborCost;
  $('other-cost').value=project.otherCost;
  updateReferenceDefaults();
}
function updateReferenceDefaults(){
  if(refImage)return;
  const l=project.layers[0];$('ref-width').value=project.type==='backdrop'?l.widthCm:l.spanCm*l.swags;
  $('ref-height').value=project.type==='backdrop'?l.heightCm:250;
}
function saveDraft(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(project));}catch{}}
function showError(text=''){$('app-error').hidden=!text;$('app-error').textContent=text;}
function display(){
  try{
    calculation=calculateProject(project);showError();
    $('theory-m').textContent=meters(calculation.theoreticalMeters);
    $('recommended-m').textContent=meters(calculation.recommendedMeters);
    $('purchase-m').textContent=meters(calculation.purchaseMeters);
    $('project-cost').textContent=money(calculation.totalCost);
    $('buffer-ratio').textContent=`${calculation.totalBuffers}%`;
    $('buffer-sum').textContent=`${calculation.totalBuffers}%`;
    $('layer-count').textContent=`${project.layers.length} LAYERS`;
    $('material-total').textContent='฿ '+money(calculation.fabricSubtotal);
    $('extras-total').textContent='฿ '+money(calculation.laborCost+calculation.otherCost);
    $('grand-total').textContent='฿ '+money(calculation.totalCost);
    renderLayerList();renderBill();
    $('layer-legend').innerHTML=project.layers.map(l=>`<span class="legend-badge"><span class="legend-dot" style="background:${/^#[0-9a-f]{6}$/i.test(l.color)?l.color:'#ffffff'}"></span>${safe(l.name)}</span>`).join('');
    renderer.set(project);
    if(refImage)drawReference();
    saveDraft();
  }catch(err){calculation=null;showError('กรุณาตรวจสอบค่าที่กรอก: '+err.message);
    for(const id of ['theory-m','recommended-m','purchase-m','project-cost','grand-total'])$(id).textContent='—';}
}
function refresh(){buildConfig();display();}
function renderLayerList(){
  $('layer-list').innerHTML=project.layers.map((l,index)=>{
    const detail=calculation?.items[index];
    return `<div class="layer-entry ${l.id===selectedId?'selected':''} ${l.visible?'':'muted'}" data-layer-id="${safe(l.id)}" role="button" tabindex="0" aria-label="เลือก ${safe(l.name)}"><div class="layer-color" style="background:${/^#[0-9a-f]{6}$/i.test(l.color)?l.color:'#fff'}"></div><div class="layer-info"><b><span style="color:#7b9aaf">${String(index+1).padStart(2,'0')} /</span> ${safe(l.name)}</b><span>${project.type==='backdrop'?`${l.widthCm} × ${l.heightCm} ซม.`:`${l.spanCm} ซม. × ${l.swags} ช่วง`} · ${l.fabricWidth} ซม. · ${meters(detail?.purchaseMeters??0)} ม.</span></div><div class="layer-cost"><strong>฿ ${money(detail?.fabricCost??0)}</strong><small>฿${money(l.unitPrice)}/เมตร</small></div><div class="layer-buttons"><button data-layer-action="up" data-id="${safe(l.id)}" title="เลื่อน Layer ขึ้น" ${index===0?'disabled':''}>↑</button><button data-layer-action="down" data-id="${safe(l.id)}" title="เลื่อน Layer ลง" ${index===project.layers.length-1?'disabled':''}>↓</button><button data-layer-action="visibility" data-id="${safe(l.id)}" title="ซ่อนเฉพาะในพรีวิว (ต้นทุนยังนับอยู่)">${l.visible?'◉':'◯'}</button><button class="danger" data-layer-action="remove" data-id="${safe(l.id)}" title="ลบ Layer" ${project.layers.length===1?'disabled':''}>×</button></div></div>`;
  }).join('');
}
function renderBill(){
  $('bom-rows').innerHTML=calculation.items.map((r,index)=>{
    const l=project.layers[index],label=project.type==='backdrop'?`${r.panelCount} ผืน`:`${r.swagCount} ช่วง`;
    return `<tr><td><span class="table-dot" style="background:${l.color}"></span>${safe(l.name)}<small style="display:block;margin-left:19px;color:#96a8b7">จำนวน ${r.quantity} ชุด</small></td><td>${label}</td><td>${meters(r.theoreticalMeters)}</td><td><strong>${meters(r.purchaseMeters)}</strong></td><td>${money(r.unitPrice)}</td><td>฿ ${money(r.fabricCost)}</td></tr>`;
  }).join('');
}
function nextId(){return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
function addLayer(duplicate=false){
 if(project.layers.length>=12){showError('ระบบรองรับสูงสุด 12 Layer ต่อโปรเจกต์');return;}
 const l=clone(layer()),id=nextId();l.id=id;l.name=duplicate?`${l.name} (Copy)`:`ผ้า Layer ${project.layers.length+1}`;
 if(!duplicate){l.color=PALETTE[(project.layers.length+1)%PALETTE.length][0];l.depthCm=Math.max(0,...project.layers.map(a=>a.depthCm))+10;l.opacity=95;if(project.type==='backdrop'){l.widthCm=Math.max(30,l.widthCm*.6);l.heightCm=Math.max(30,l.heightCm*.93);}else{l.sagCm+=20;}}
 project.layers.push(l);selectedId=id;refresh();
}
function changeLayerOrder(id,direction){const index=project.layers.findIndex(l=>l.id===id);const to=index+direction;if(index<0||to<0||to>=project.layers.length)return;[project.layers[index],project.layers[to]]=[project.layers[to],project.layers[index]];display();}
function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
const fileStamp=()=>new Date().toISOString().slice(0,10);
function exportProject(){const payload={...project,referenceImage:refImageData||null,exportedAt:new Date().toISOString()};download(`fabric-studio-v3-${fileStamp()}.json`,new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));}
const csvSafe=value=>{const v=String(value??'');const protectedValue=/^[=+@\-\t\r]/.test(v)?"'"+v:v;return '"'+protectedValue.replace(/"/g,'""')+'"';};
function exportCsv(){if(!calculation)return;const header=['ชื่อ Layer','ประเภท','จำนวนชุด','ผืน/ช่วง','ทฤษฎี (ม.)','แนะนำ (ม.)','สั่งซื้อ (ม.)','บาท/เมตร','รวม (บาท)'];
 const rows=calculation.items.map((r,i)=>[r.layerName,project.type,r.quantity,project.type==='backdrop'?r.panelCount:r.swagCount,r.theoreticalMeters.toFixed(3),r.recommendedMeters.toFixed(3),r.purchaseMeters.toFixed(3),r.unitPrice.toFixed(2),r.fabricCost.toFixed(2)]);
 rows.push(['ค่าแรง','','','','','','','',''+calculation.laborCost],['อุปกรณ์ / อื่น ๆ','','','','','','','',''+calculation.otherCost],['รวมทั้งหมด','','','','','','','',''+calculation.totalCost]);
 download(`fabric-cost-v3-${fileStamp()}.csv`,new Blob(['\uFEFF'+[header,...rows].map(row=>row.map(csvSafe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
}
function exportPng(){const canvas=view==='3d'?$('design-canvas'):$('reference-canvas');canvas.toBlob(blob=>{if(blob)download(`fabric-layer-preview-${fileStamp()}.png`,blob);},'image/png');}

// Photo area annotation uses a user-provided physical scale; it never infers true depth from a photograph.
function setRefNotice(message){$('ref-notice').textContent=message;}
async function loadPhoto(file){
 if(!file || !/^image\/(png|jpeg|webp)$/.test(file.type)){setRefNotice('รองรับเฉพาะไฟล์ PNG, JPG และ WEBP');return;}
 if(file.size>12*1024*1024){setRefNotice('ภาพต้องมีขนาดไม่เกิน 12 MB');return;}
 const readURL=await new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(reader.error);reader.readAsDataURL(file);});
 await useDataUrl(readURL);setRefNotice('อัปโหลดสำเร็จ · ระบุขนาดอ้างอิง แล้วลากเลือกบริเวณผ้าบนภาพ');
}
async function useDataUrl(url){
 const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('ไม่สามารถเปิดภาพได้'));img.src=url;});
 if(img.naturalWidth<4||img.naturalHeight<4)throw new Error('ภาพมีขนาดเล็กเกินไป');
 const maxDim=1500,r=Math.min(1,maxDim/Math.max(img.width,img.height));
 const off=document.createElement('canvas');off.width=Math.max(1,Math.round(img.width*r));off.height=Math.max(1,Math.round(img.height*r));off.getContext('2d').drawImage(img,0,0,off.width,off.height);
 refImageData=off.toDataURL('image/jpeg',.82);
 const small=new Image();await new Promise((res,rej)=>{small.onload=res;small.onerror=rej;small.src=refImageData;});
 refImage=small;draftRegion=null;refViewport=null;$('upload-placeholder').hidden=true;drawReference();
}
function resetPhoto(){refImage=null;refImageData='';draftRegion=null;refViewport=null;$('upload-placeholder').hidden=false;drawReference();}
function refCanvasSize(){const canvas=$('reference-canvas'),r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),W=r.width,H=r.height;if(W<1||H<1)return null;
 if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);}
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,W,H};}
function drawReference(){const sized=refCanvasSize();if(!sized)return;const {ctx,W,H}=sized;
 ctx.fillStyle='#eaf2f8';ctx.fillRect(0,0,W,H);if(!refImage){refViewport=null;return;}
 const pad=8,ratio=Math.min((W-pad*2)/refImage.width,(H-pad*2)/refImage.height);
 const w=refImage.width*ratio,h=refImage.height*ratio,x=(W-w)/2,y=(H-h)/2;refViewport={x,y,w,h};
 ctx.drawImage(refImage,x,y,w,h);
 for(const l of project.layers){if(!l.region)continue;const box=l.region;paintRegion(box,l.color,l.id===selectedId?3:1.5,0.16,l.name);}
 if(draftRegion)paintRegion(draftRegion,'#327abb',2,.18,'เลือกพื้นที่');
 function paintRegion(box,color,line,alpha,title){
  const rx=x+box.x*w,ry=y+box.y*h,rw=box.w*w,rh=box.h*h;
  ctx.fillStyle=/^#[0-9a-f]{6}$/i.test(color)?color:'#cce3f7';ctx.globalAlpha=alpha;ctx.fillRect(rx,ry,rw,rh);ctx.globalAlpha=1;
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=line;ctx.setLineDash([7,4]);ctx.strokeRect(rx,ry,rw,rh);ctx.restore();
  ctx.fillStyle='#1e4565';ctx.font='bold 11px sans-serif';const str=String(title).slice(0,29);const tx=Math.max(x,Math.min(rx,x+w-140)),ty=Math.max(y+16,ry-7);
  ctx.fillText(str,tx,ty);
 }
}
function locateInImage(e){if(!refViewport)return null;const r=$('reference-canvas').getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
 return {x:Math.max(0,Math.min(1,(px-refViewport.x)/refViewport.w)),y:Math.max(0,Math.min(1,(py-refViewport.y)/refViewport.h))};}
function startPointer(e){if(!refImage)return;const p=locateInImage(e);if(!p)return;
 if(refTool==='color'){detectRegionByColor(p);return;}
 draggingRef=true;pointerStart=p;draftRegion={x:p.x,y:p.y,w:0,h:0};$('reference-canvas').setPointerCapture(e.pointerId);drawReference();}
function movePointer(e){if(!draggingRef||!pointerStart)return;const p=locateInImage(e);if(!p)return;
 draftRegion={x:Math.min(p.x,pointerStart.x),y:Math.min(p.y,pointerStart.y),w:Math.abs(p.x-pointerStart.x),h:Math.abs(p.y-pointerStart.y)};drawReference();}
function stopPointer(){if(!draggingRef)return;draggingRef=false;pointerStart=null;reportRegion();drawReference();}
function reportRegion(){if(!draftRegion||draftRegion.w<.01||draftRegion.h<.01){$('detected-region').textContent='กรุณาเลือกพื้นที่ให้กว้างขึ้น';$('apply-region').disabled=true;return;}
 try{const dims=estimatedImageRegion(draftRegion,Number($('ref-width').value),Number($('ref-height').value));
 $('detected-region').textContent=`พื้นที่ที่เลือก ≈ ${dims.widthCm.toFixed(1)} × ${dims.heightCm.toFixed(1)} ซม.`;
 $('apply-region').disabled=false;
 }catch(e){$('detected-region').textContent='ตรวจสอบขนาดอ้างอิงก่อน';$('apply-region').disabled=true;}}
function detectRegionByColor(point){
 if(!refImage)return;const maxDim=440,scale=Math.min(1,maxDim/Math.max(refImage.width,refImage.height));
 const w=Math.max(1,Math.floor(refImage.width*scale)),h=Math.max(1,Math.floor(refImage.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(refImage,0,0,w,h);
 const pixels=ctx.getImageData(0,0,w,h).data,sx=Math.min(w-1,Math.floor(point.x*w)),sy=Math.min(h-1,Math.floor(point.y*h)),start=sy*w+sx,tol=Number($('color-tolerance').value);
 const r0=pixels[start*4],g0=pixels[start*4+1],b0=pixels[start*4+2],threshold=tol*tol*3;
 const visited=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=1;queue[0]=start;visited[start]=1;
 let minX=w,maxX=0,minY=h,maxY=0,count=0;
 while(head<tail){const at=queue[head++],x=at%w,y=(at/w)|0,ii=at*4;
  const dr=pixels[ii]-r0,dg=pixels[ii+1]-g0,db=pixels[ii+2]-b0;if(dr*dr+dg*dg+db*db>threshold)continue;
  count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  const neighbors=[x>0?at-1:-1,x<w-1?at+1:-1,y>0?at-w:-1,y<h-1?at+w:-1];
  for(const next of neighbors){if(next>=0&&!visited[next]){visited[next]=1;queue[tail++]=next;}}
 }
 if(count<20){setRefNotice('ไม่พบพื้นที่สีต่อเนื่องมากพอ ลองเพิ่มความใกล้เคียงสีหรือใช้โหมดตีกรอบ');return;}
 const region={x:minX/w,y:minY/h,w:(maxX-minX+1)/w,h:(maxY-minY+1)/h};
 if(region.w*region.h>.92){setRefNotice('บริเวณสีที่เลือกครอบคลุมเกือบทั้งภาพ แนะนำใช้โหมดตีกรอบเพื่อความแม่นยำ');return;}
 draftRegion=region;reportRegion();drawReference();setRefNotice(`พบกลุ่มสีต่อเนื่อง ${count.toLocaleString()} พิกเซล (กล่องครอบโดยประมาณ) กรุณาตรวจสอบก่อนใช้`);
}
function applyRegion(){if(!draftRegion)return;
 try{const dims=estimatedImageRegion(draftRegion,Number($('ref-width').value),Number($('ref-height').value));const l=layer();
  if(project.type==='backdrop'){l.widthCm=Number(dims.widthCm.toFixed(2));l.heightCm=Number(dims.heightCm.toFixed(2));}
  else{l.spanCm=Number((dims.widthCm/l.swags).toFixed(2));}
  l.xOffsetCm=Number(dims.xOffsetCm.toFixed(2));l.region={...draftRegion};draftRegion=null;
  setRefNotice(`นำขนาดที่อ่านจากภาพไปใช้กับ "${l.name}" แล้ว · โปรดตรวจสอบค่าขนาดจริงอีกครั้ง`);refresh();
 }catch(e){setRefNotice(e.message);}
}
function chooseView(next){view=next;$('design-view').hidden=next!=='3d';$('reference-view').hidden=next!=='reference';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 requestAnimationFrame(()=>{if(next==='3d')renderer.draw();else drawReference();});}
function validateImport(raw){
 if(!raw||!Array.isArray(raw.layers)||raw.layers.length<1||raw.layers.length>12||!['backdrop','ceilingDrape'].includes(raw.type))throw new Error('รูปแบบไฟล์โปรเจกต์ไม่ถูกต้อง');
 const out={...clone(DEFAULT_PROJECT),name:String(raw.name||'Imported design').slice(0,90),type:raw.type,increment:raw.increment,
  buffers:raw.buffers,laborCost:raw.laborCost,otherCost:raw.otherCost,
  layers:raw.layers.map((x,i)=>({...clone(DEFAULT_PROJECT.layers[0]),...x,
    id:`import-${i}`,name:String(x.name||`Layer ${i+1}`).slice(0,70),
    color:/^#[0-9a-f]{6}$/i.test(x.color)?x.color:'#f5f6f7',
    visible:x.visible!==false}))};
 calculateProject(out);
 return out;
}

// Events
$('project-name').addEventListener('input',e=>{project.name=e.target.value;saveDraft();});
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{const type=button.dataset.mode;
 if(type===project.type)return;if(!confirm('เปลี่ยนรูปแบบผ้าของทุก Layer? ขนาดเดิมจะถูกเก็บไว้และสามารถสลับกลับได้'))return;project.type=type;refresh();});
document.querySelector('.config-panel').addEventListener('input',e=>{
 const target=e.target,key=target.dataset.layer,buffer=target.dataset.buffer;
 if(key){layer()[key]=key==='name'?target.value:Number(target.value);if(key==='opacity')$('opacity-label').textContent=target.value+'%';display();}
 if(buffer){project.buffers[buffer]=Number(target.value);display();}
});
$('dynamic-dimensions').addEventListener('change',e=>{if(e.target.id==='ceiling-method'){layer().method=e.target.value;display();}});
$('color-palette').addEventListener('click',e=>{const color=e.target.dataset.palette;if(!color)return;layer().color=color;buildConfig();display();});
$('layer-color').addEventListener('input',e=>{layer().color=e.target.value;document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('active',b.dataset.palette===layer().color));display();});
$('layer-opacity').addEventListener('input',e=>{layer().opacity=Number(e.target.value);$('opacity-label').textContent=e.target.value+'%';display();});
document.querySelectorAll('[data-width]').forEach(b=>b.addEventListener('click',()=>{layer().fabricWidth=Number(b.dataset.width);refresh();}));
$('increment').addEventListener('change',e=>{project.increment=Number(e.target.value);display();});
$('labor-cost').addEventListener('input',e=>{project.laborCost=Number(e.target.value);display();});
$('other-cost').addEventListener('input',e=>{project.otherCost=Number(e.target.value);display();});
$('add-layer').addEventListener('click',()=>addLayer());$('duplicate-layer').addEventListener('click',()=>addLayer(true));
$('layer-list').addEventListener('click',e=>{
 const action=e.target.closest('[data-layer-action]');if(action){const id=action.dataset.id,kind=action.dataset.layerAction,index=project.layers.findIndex(l=>l.id===id);
  if(kind==='up'||kind==='down')changeLayerOrder(id,kind==='up'?-1:1);
  else if(kind==='visibility'){project.layers[index].visible=!project.layers[index].visible;display();}
  else if(kind==='remove'&&project.layers.length>1){project.layers.splice(index,1);if(selectedId===id)selectedId=project.layers[Math.max(0,index-1)].id;refresh();}
  return;
 }
 const row=e.target.closest('[data-layer-id]');if(row){selectedId=row.dataset.layerId;refresh();}
});
$('layer-list').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const row=e.target.closest('[data-layer-id]');if(row&&!e.target.closest('button')){e.preventDefault();selectedId=row.dataset.layerId;refresh();}}});
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>chooseView(b.dataset.view));
$('reset-camera').addEventListener('click',()=>renderer.resetCamera());$('save-png').addEventListener('click',exportPng);
$('export-csv').addEventListener('click',exportCsv);
$('download-json').addEventListener('click',exportProject);$('download-json-bottom').addEventListener('click',exportProject);
$('reset-project').addEventListener('click',()=>{if(!confirm('เริ่มโปรเจกต์ใหม่? แบบร่างปัจจุบันที่ยังไม่ได้ Export จะถูกแทนที่'))return;
 project=clone(DEFAULT_PROJECT);selectedId=project.layers[0].id;resetPhoto();refresh();});
$('import-button').addEventListener('click',()=>$('import-json').click());
$('import-json').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>7*1024*1024)throw new Error('ไฟล์โปรเจกต์มีขนาดใหญ่เกิน 7 MB');
  const raw=JSON.parse(await file.text()),verified=validateImport(raw);project=verified;selectedId=project.layers[0].id;resetPhoto();
  if(raw.referenceImage&&typeof raw.referenceImage==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(raw.referenceImage))await useDataUrl(raw.referenceImage);
  refresh();setRefNotice('เปิดไฟล์โปรเจกต์สำเร็จ');
 }catch(err){showError('นำเข้าโปรเจกต์ไม่สำเร็จ: '+err.message);}e.target.value='';});
$('image-upload').addEventListener('change',async e=>{try{await loadPhoto(e.target.files?.[0]);}catch(err){setRefNotice(err.message);}e.target.value='';});
$('upload-from-stage').addEventListener('click',()=>$('image-upload').click());
for(const b of document.querySelectorAll('[data-ref-tool]'))b.addEventListener('click',()=>{refTool=b.dataset.refTool;document.querySelectorAll('[data-ref-tool]').forEach(a=>a.classList.toggle('active',a===b));setRefNotice(refTool==='color'?'คลิกบริเวณสีผ้าที่ต้องการ ระบบจะหาโซนสีใกล้เคียงแบบทดลอง':'ลากสี่เหลี่ยมครอบบริเวณผ้าที่ต้องการคำนวณ');});
$('color-tolerance').addEventListener('input',e=>$('tolerance-label').textContent=e.target.value);
$('reference-canvas').addEventListener('pointerdown',startPointer);
$('reference-canvas').addEventListener('pointermove',movePointer);
$('reference-canvas').addEventListener('pointerup',stopPointer);
$('reference-canvas').addEventListener('pointercancel',stopPointer);
for(const el of [$('ref-width'),$('ref-height')])el.addEventListener('input',reportRegion);
$('apply-region').addEventListener('click',applyRegion);
const drop=$('reference-drop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag-over');});
drop.addEventListener('dragleave',()=>drop.classList.remove('drag-over'));
drop.addEventListener('drop',async e=>{e.preventDefault();drop.classList.remove('drag-over');try{await loadPhoto(e.dataTransfer.files[0]);}catch(err){setRefNotice(err.message);}});
window.addEventListener('resize',()=>{renderer.draw();drawReference();});
refresh();chooseView('3d');
