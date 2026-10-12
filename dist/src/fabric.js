import {calculateLayer as legacyCalculate,solveCatenary,roundUpToIncrement} from './legacy-engine.js';
import {cutEnvelope,developedWidth} from './geometry.js';
import {optimizeSteel} from './steel.js';
import {validateProject} from './model.js';
const fabricCache=new Map();
export function calculateFabric(l,p){
 const {x,y,z,color,opacity,roughness,transmission,visible,locked,band,...geometry}=l;
 const key=JSON.stringify([geometry,p.increment]);const found=fabricCache.get(l.id);if(found?.key===key)return found.result;const result=calculateFabricUncached(l,p);if(fabricCache.size>160)fabricCache.clear();fabricCache.set(l.id,{key,result});return result;
}
function calculateFabricUncached(l,p){
 if(l.estimateMode==='legacy'){
  const old={...l.legacyLayer,...l,xOffsetCm:l.x,yOffsetCm:l.y,depthCm:l.z};
  const r=legacyCalculate(old,{type:l.legacyType||l.mode,buffers:l.legacyBuffers,increment:p.increment});
  return {...r,id:l.id,name:l.name,cuts:[],allowanceMeters:r.recommendedMeters-r.theoreticalMeters,note:'สูตรเดิม V5: รวมส่วนเผื่อเป็นเปอร์เซ็นต์ / เปลี่ยนเป็นแผนตัด V6 เพื่อแจกแจงต่อผืน',basis:'legacy',roundingMeters:r.purchaseMeters-r.recommendedMeters};
 }
 const a=l.allowance,usable=l.fabricWidth-2*a.sideSeamCm;
 let lengths=[];
 if(l.mode==='ceilingDrape'){
  const len=l.method==='brief'?l.spanCm*(1+l.sagCm/l.spanCm*.6):solveCatenary(l.spanCm,l.sagCm).length;
  lengths=Array(l.swags).fill(len);
 }else{
  const count=Math.ceil(developedWidth(l)*l.fullness/usable);if(count>200)throw new Error('เกิน 200 Panel ต่อ Layer กรุณาแบ่งชั้นผ้า');
  lengths=Array.from({length:count},(_,i)=>cutEnvelope(l,i,count));
 }
 const cuts=lengths.map((raw,i)=>{const seam=raw+2*a.seamCm,shrink=seam/(1-a.shrinkage/100),cut=a.patternRepeatCm?roundUpToIncrement(shrink,a.patternRepeatCm):shrink;return {panel:i+1,quantity:l.quantity,rawCm:raw,seamCm:2*a.seamCm,shrinkageCm:shrink-seam,patternCm:cut-shrink,cutCm:cut};});
 const theoreticalMeters=lengths.reduce((s,n)=>s+n,0)*l.quantity/100,cutMeters=cuts.reduce((s,c)=>s+c.cutCm,0)*l.quantity/100,recommendedMeters=cutMeters*(1+a.wastage/100),purchaseMeters=roundUpToIncrement(recommendedMeters,p.increment);
 return {id:l.id,name:l.name,quantity:l.quantity,panelCount:lengths.length*l.quantity,cuts,theoreticalMeters,cutMeters,wastageMeters:recommendedMeters-cutMeters,allowanceMeters:recommendedMeters-theoreticalMeters,recommendedMeters,purchaseMeters,roundingMeters:purchaseMeters-recommendedMeters,unitPrice:l.unitPrice,fabricCost:purchaseMeters*l.unitPrice,basis:'panel-envelope',note:l.mode==='ceilingDrape'?'ผ้าหน้ากว้างเต็มม้วนตามแนวช่วงแขวน; Catenary สมมติปลายสองข้างระดับเท่ากัน':'ตัดแถบสี่เหลี่ยมตามความยาวสูงสุดในแต่ละ Panel; Fullness ใช้เพิ่มจำนวน Panel; ยังไม่ใช่แพทเทิร์นคลี่ผ้าแบบไม่ยืด'};
}
export function estimate(p){validateProject(p);const fabric=p.layers.map(l=>calculateFabric(l,p)),steel=optimizeSteel(p.steel.items,p.steel.kerf),accessories=p.steel.accessories.reduce((s,a)=>{if(!Number.isInteger(a.quantity)||a.quantity<0||!Number.isFinite(a.price)||a.price<0)throw new Error('อุปกรณ์: จำนวน/ราคาไม่ถูกต้อง');return s+a.quantity*a.price;},0);const sum=k=>fabric.reduce((s,r)=>s+r[k],0);return {fabric,steel,accessories,theory:sum('theoreticalMeters'),purchase:sum('purchaseMeters'),fabricCost:sum('fabricCost'),total:sum('fabricCost')+steel.cost+accessories+p.laborCost+p.otherCost,fabricKg:fabric.reduce((s,r,i)=>s+r.theoreticalMeters*p.layers[i].fabricWidth/100*p.gsm/1000,0)};}
export function csv(rows){return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
