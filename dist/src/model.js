import {DEFAULT_PROJECT,REFERENCE_PRESETS,STEEL_PROFILES} from './legacy-engine.js';
import {defaultAnchors,outlineAt} from './geometry.js';
export const copy=x=>structuredClone(x);
export const uid=()=>globalThis.crypto?.randomUUID?.()||`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function newLayer(extra={}){return {id:uid(),name:'ชั้นผ้าใหม่',shape:'straight',mode:'backdrop',band:'middle',color:'#bfd7eb',opacity:100,roughness:.85,transmission:0,widthCm:300,heightCm:250,depth:0,x:0,y:0,z:15,fullness:2,fabricWidth:150,quantity:1,unitPrice:95,visible:true,locked:false,curve:'bezier',anchors:defaultAnchors(),sagCm:60,direction:1,repeats:2,sweepCm:50,spanCm:300,swags:2,method:'exact',allowance:{seamCm:5,sideSeamCm:1,shrinkage:0,patternRepeatCm:0,wastage:5},estimateMode:'panels',...extra};}
export function defaultSteel(){return [
 {id:uid(),name:'คาน',type:'RHS',w:45,h:75,t:2.3,grade:'unspecified',length:2500,quantity:2,price:470},
 {id:uid(),name:'เสา',type:'SHS',w:50,h:50,t:2.3,grade:'unspecified',length:2600,quantity:3,price:390},
 {id:uid(),name:'ค้ำยัน',type:'SHS',w:40,h:40,t:2,grade:'unspecified',length:3607,quantity:4,price:320}];}
export function newProject(){return {version:6,name:'ฉากแต่งงาน · White & Blue',width:500,height:270,layers:[newLayer({name:'ผ้าขาวด้านหลัง',color:'#f0f3f7',widthCm:500,heightCm:270,z:0,band:'back'}),newLayer({name:'ผ้าฟ้าหย่อนด้านบน',shape:'swag',widthCm:480,heightCm:55,sagCm:90,z:22,y:4,band:'front',fullness:1.7}),newLayer({name:'ผ้าข้างรวบ',shape:'side',widthCm:95,heightCm:260,x:-193,y:10,z:35,sweepCm:60,band:'front'})],render:{look:'clean',person:true,personHeight:170,floral:false,frame:true,quality:'auto'},reference:{image:null,quad:[],calibrated:false,width:500,height:270},steel:{kerf:3,items:defaultSteel(),accessories:[{id:uid(),name:'เพลทฐาน',quantity:6,price:90},{id:uid(),name:'อุปกรณ์เชื่อมต่อ',quantity:1,price:0}]},increment:.5,laborCost:0,otherCost:0,gsm:180};}
function legacySteel(frame){if(!frame)return defaultSteel();const rows=[];for(const [role,profileKey,length,quantity,price] of [['คาน',frame.beamProfile,frame.spanCm*10,frame.bays,frame.beamPrice],['เสา',frame.postProfile,frame.heightCm*10,frame.bays+1,frame.postPrice],['ค้ำยัน',frame.braceProfile,Math.round(Math.hypot(frame.spanCm,frame.heightCm)*10),frame.includeBracing?frame.bays*2:0,frame.bracePrice]]){if(!quantity)continue;const s=STEEL_PROFILES[profileKey]||STEEL_PROFILES['shs-40-40-20'];rows.push({id:uid(),name:role,type:s.w===s.h?'SHS':'RHS',w:s.w,h:s.h,t:s.t,grade:'unspecified',length,quantity,price:price||0});}return rows;}
export function migrate(raw){
 if(!raw||!Array.isArray(raw.layers)||raw.layers.length<1||raw.layers.length>80)throw new Error('ไฟล์ต้องมี Layer 1–80 ชั้น');
 if(Number(raw.version)>6)throw new Error('โปรเจกต์นี้สร้างด้วยเวอร์ชันที่ใหม่กว่า');
 if(Number(raw.version)===6){const p=copy(raw);p.layers=p.layers.map(l=>newLayer(l));validateProject(p);return p;}
 const p=newProject();p.name=String(raw.name||'นำเข้าจาก V5');p.legacySource=copy(raw);p.width=Math.max(...raw.layers.map(l=>Number(l.widthCm)||500));p.height=Math.max(...raw.layers.map(l=>Number(l.heightCm)||270));
 p.layers=raw.layers.map((l,i)=>newLayer({...l,id:l.id||uid(),shape:'legacy',mode:raw.type||'backdrop',x:Number(l.xOffsetCm)||0,y:p.height-(Number(l.yOffsetCm)||0)-(Number(l.heightCm)||270),z:Number(l.depthCm)||0,band:i===0?'back':'middle',estimateMode:'legacy',legacyBuffers:raw.buffers||DEFAULT_PROJECT.buffers,legacyType:raw.type||'backdrop',legacyLayer:copy(l)}));
 p.increment=raw.increment||.5;p.laborCost=raw.laborCost||0;p.otherCost=raw.otherCost||0;p.steel.items=legacySteel(raw.frame);
 p.steel.accessories=[{id:uid(),name:'เพลทฐาน',quantity:raw.frame?.basePlateCount||0,price:raw.frame?.basePlatePrice||0}];
 if(typeof raw.referenceImage==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(raw.referenceImage))p.reference.image=raw.referenceImage;
 p.render.person=raw.render?.showPerson!==false;p.render.floral=!!raw.render?.floralTop;p.render.frame=raw.frame?.showFrame!==false;
 validateProject(p);return p;
}
export function validateProject(p){
 const check=(v,name,min=0,max=100000)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error(`${name}: ค่าไม่ถูกต้อง (${min}–${max})`);};
 if(!Array.isArray(p.layers)||!p.layers.length||p.layers.length>80)throw new Error('จำนวนชั้นผ้าไม่ถูกต้อง');
 const ids=new Set();
 check(p.width,'ความกว้างฉาก',1,5000);check(p.height,'ความสูงฉาก',1,5000);check(p.increment,'การปัดยอด',.01,100);
 for(const l of p.layers){if(typeof l.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(l.id)||ids.has(l.id))throw new Error('Layer ID ไม่ถูกต้องหรือซ้ำ');ids.add(l.id);
 if(!['straight','swag','scallop','arch','cross','side','center','trace','legacy'].includes(l.shape)||!['backdrop','ceilingDrape'].includes(l.mode)||!['bezier','catenary'].includes(l.curve)||!['panels','legacy'].includes(l.estimateMode))throw new Error('รูปแบบผ้าหรือวิธีคำนวณไม่รองรับ');
 check(l.roughness,'ความด้าน',0,1);check(l.transmission,'ความโปร่ง',0,1);check(l.repeats,'จำนวนโค้ง',1,8);check(l.sweepCm,'ระยะปัด',-150,150);check(l.spanCm,'ระยะช่วง',1,5000);check(l.swags,'จำนวนช่วง',1,24);if(!Number.isInteger(l.swags))throw new Error('จำนวนช่วงต้องเป็นจำนวนเต็ม');
 if(l.mode==='ceilingDrape'&&l.sagCm>l.spanCm*3)throw new Error('ระยะหย่อนเกิน 3 เท่าของช่วง');
 check(l.widthCm,'กว้าง',1,5000);check(l.heightCm,'สูง',1,5000);check(l.fabricWidth,'หน้าผ้า',1,1000);check(l.fullness,'Fullness',1,6);check(l.quantity,'จำนวน',1,9999);if(!Number.isInteger(l.quantity))throw new Error('จำนวนต้องเป็นจำนวนเต็ม');check(l.unitPrice,'ราคา');check(l.opacity,'ความทึบ',0,100);check(l.depth,'ความลึก',0,500);check(l.sagCm,'ระยะหย่อน',0,1500);
  for(const key of ['x','y','z'])check(l[key],key,-10000,10000);
  for(const key of ['top','bottom']){if(!Array.isArray(l.anchors?.[key])||l.anchors[key].length<2||l.anchors[key].length>30)throw new Error('Anchor ต่อเส้นต้องมี 2–30 จุด');for(const a of l.anchors[key]){check(a.x,'Anchor X',-5,5);check(a.y,'Anchor Y',-5,5);for(const h of ['in','out'])if(a[h]){check(a[h].x,'Handle X',-5,5);check(a[h].y,'Handle Y',-5,5);}}}
  if(l.shape==='arch'&&l.sagCm>=l.heightCm)throw new Error('ระยะโค้ง Arch ต้องน้อยกว่าความสูงผ้า');
 if(l.shape==='trace'){let previous=null;for(let i=0;i<=80;i++){const edge=outlineAt(l,i/80);if(edge[1].y<=edge[0].y+.01)throw new Error('ขอบล่างต้องอยู่ต่ำกว่าขอบบนของผ้า');if(previous&&(edge[0].x<previous[0].x-.01||edge[1].x<previous[1].x-.01))throw new Error('เส้น Trace ต้องเรียงจากซ้ายไปขวาโดยไม่วกกลับ');previous=edge;}}
 const a=l.allowance;for(const k of ['seamCm','sideSeamCm','patternRepeatCm'])check(a?.[k],k,0,200);check(a.shrinkage,'หดตัว',0,30);check(a.wastage,'เผื่อเสีย',0,100);
  if(l.fabricWidth<=2*a.sideSeamCm)throw new Error('หน้าผ้าหลังหักตะเข็บข้างต้องมากกว่า 0');
 }
 check(p.reference?.width,'ความกว้างอ้างอิง',1,5000);check(p.reference?.height,'ความสูงอ้างอิง',1,5000);check(p.gsm,'น้ำหนักผ้า GSM',1,2000);check(p.render?.personHeight,'ความสูงคน',80,220);
 check(p.laborCost,'ค่าแรง');check(p.otherCost,'ค่าใช้จ่าย');
 if(p.reference?.image&&!/^data:image\/(png|jpeg|webp);base64,/.test(p.reference.image))throw new Error('ภาพอ้างอิงต้องเป็น PNG, JPG หรือ WEBP ในไฟล์');
 return p;
}
export function preset(key){const old=REFERENCE_PRESETS[key];if(!old)throw new Error('ไม่พบรูปแบบ');return migrate({...DEFAULT_PROJECT,...copy(old),name:old.label,version:5,layers:old.layers.map((l,i)=>({...DEFAULT_PROJECT.layers[0],...l,id:uid()}))});}
export class History{
 constructor(project,limit=70){this.items=[JSON.stringify(project)];this.index=0;this.limit=limit;}
 push(p){const s=JSON.stringify(p);if(this.items[this.index]===s)return;this.items.splice(this.index+1);this.items.push(s);if(this.items.length>this.limit)this.items.shift();this.index=this.items.length-1;}
 undo(){if(this.index>0)this.index--;return JSON.parse(this.items[this.index]);}
 redo(){if(this.index<this.items.length-1)this.index++;return JSON.parse(this.items[this.index]);}
}
