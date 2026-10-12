import { calculateElement, roundUpToIncrement, normalizeBuffers } from './engine.js';

export const PALETTE = [
  ['#f5f6f7','ขาวนวล'],['#d8e5f1','ฟ้าหมอก'],['#97b4d4','ฟ้าคราม'],
  ['#244367','น้ำเงินเข้ม'],['#b8c8d3','เทาเงิน'],['#b9cbbf','เขียวเซจ'],
  ['#e9c6cf','ชมพูอ่อน'],['#cdbce4','ลาเวนเดอร์'],['#d9c5b2','แชมเปญ'],['#191e2a','ดำ']
];
export const DEFAULT_PROJECT = {
  version:3, name:'Wedding Fabric Studio · Concept 01', type:'backdrop', increment:0.5,
  buffers:{seamBuffer:7,shrinkageBuffer:0,patternMatchBuffer:0,wastageBuffer:5},
  laborCost:0,otherCost:0,
  layers:[
    {id:'layer-base',name:'ผ้าหลัก · White Base',visible:true,color:'#f5f6f7',opacity:100,
      widthCm:500,heightCm:250,spanCm:400,sagCm:80,swags:3,method:'brief',fabricWidth:150,fullness:2,quantity:1,unitPrice:95,xOffsetCm:0,depthCm:0},
    {id:'layer-accent',name:'ผ้าซ้อน · Soft Blue',visible:true,color:'#97b4d4',opacity:93,
      widthCm:260,heightCm:245,spanCm:400,sagCm:110,swags:3,method:'brief',fabricWidth:150,fullness:1.7,quantity:1,unitPrice:125,xOffsetCm:0,depthCm:14}
  ]
};

function finiteNumber(value,name,min=0) {
  const n=Number(value);
  if(!Number.isFinite(n)||n<min)throw new RangeError(`${name} must be ≥ ${min}`);
  return n;
}
export function calculateLayer(layer,project) {
  if(!layer || !project) throw new TypeError('Project and layer are required');
  const quantity=finiteNumber(layer.quantity,'quantity',1);
  if(!Number.isInteger(quantity)||quantity>9999)throw new RangeError('quantity must be an integer ≤ 9999');
  const unitPrice=finiteNumber(layer.unitPrice,'unitPrice',0);
  const sceneParams={color:layer.color};
  const inputs={fabricWidth:layer.fabricWidth,fullnessRatio:layer.fullness,
    dimensions:project.type==='backdrop' ? {backdropWidth:layer.widthCm,backdropHeight:layer.heightCm}:
      {spanDistance:layer.spanCm,sagDepth:layer.sagCm,numberOfSwags:layer.swags,calculationMethod:layer.method}};
  const calculated=calculateElement({id:layer.id,type:project.type,inputs,buffers:project.buffers,sceneParams},project.increment);
  // Repeated pieces are rounded after multiplication, not once per piece.
  const raw=calculated.result;
  const theoreticalMeters=raw.theoreticalMeters*quantity;
  const recommendedMeters=raw.recommendedMeters*quantity;
  const purchaseMeters=roundUpToIncrement(recommendedMeters,project.increment);
  const fabricCost=purchaseMeters*unitPrice;
  return {layerId:layer.id,layerName:layer.name,quantity,unitPrice,
    theoreticalMeters,recommendedMeters,purchaseMeters,fabricCost,
    panelCount:(raw.panelCount??0)*quantity,swagCount:(raw.numberOfSwags??0)*quantity,
    perUnit:raw,sceneParams:calculated.sceneParams};
}
export function calculateProject(project) {
  if(!project||!Array.isArray(project.layers)||!['backdrop','ceilingDrape'].includes(project.type))throw new Error('Invalid project');
  if(!project.layers.length)throw new Error('Add at least one layer');
  normalizeBuffers(project.buffers);
  const increment=finiteNumber(project.increment,'increment',.01);
  if(increment>100)throw new RangeError('Purchase increment is too large');
  const laborCost=finiteNumber(project.laborCost,'laborCost',0);
  const otherCost=finiteNumber(project.otherCost,'otherCost',0);
  const items=project.layers.map(l=>calculateLayer(l,{...project,increment}));
  const sum=k=>items.reduce((acc,i)=>acc+i[k],0);
  const fabricSubtotal=sum('fabricCost');
  return {items,theoreticalMeters:sum('theoreticalMeters'),recommendedMeters:sum('recommendedMeters'),
    purchaseMeters:sum('purchaseMeters'),fabricSubtotal,laborCost,otherCost,totalCost:fabricSubtotal+laborCost+otherCost,
    layerCount:items.length,totalBuffers:Object.values(normalizeBuffers(project.buffers)).reduce((a,b)=>a+b,0),
    remark:'Lengths are separately rounded by layer. Identical fabrics may be consolidated after cut planning.'};
}
export function estimatedImageRegion(bbox,referenceWidthCm,referenceHeightCm){
  const width=finiteNumber(referenceWidthCm,'referenceWidthCm',.01);
  const height=finiteNumber(referenceHeightCm,'referenceHeightCm',.01);
  const {x,y,w,h}=bbox||{};
  for(const [key,v] of Object.entries({x,y,w,h}))if(!Number.isFinite(v)||v<0||v>1)throw new RangeError(`${key} must be in [0,1]`);
  if(w===0||h===0||x+w>1.0000001||y+h>1.0000001)throw new RangeError('Region must fit in reference image');
  return {widthCm:w*width,heightCm:h*height,xOffsetCm:(x+w/2-.5)*width};
}
export function roundBaht(amount){return Math.round((Number(amount)+Number.EPSILON)*100)/100;}
