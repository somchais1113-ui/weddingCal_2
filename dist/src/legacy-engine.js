
// --- engine.js ---
/** Centimetres are the canonical internal unit. Buffer inputs use percent points. */
const DEFAULT_BUFFERS = Object.freeze({ seamBuffer: 7, shrinkageBuffer: 0, patternMatchBuffer: 0, wastageBuffer: 5 });

function positiveNumber(value, label, allowZero = false) {
  const n = Number(value);
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) {
    throw new RangeError(`${label} must be ${allowZero ? 'non-negative' : 'positive'} and finite`);
  }
  return n;
}

function normalizeBuffers(buffers = {}) {
  const merged = { ...DEFAULT_BUFFERS, ...buffers };
  const result = {};
  for (const key of Object.keys(DEFAULT_BUFFERS)) {
    const n = positiveNumber(merged[key], key, true);
    if (n > 100) throw new RangeError(`${key} cannot exceed 100%`);
    result[key] = n;
  }
  return result;
}

function roundUpToIncrement(value, increment = 0.5) {
  positiveNumber(increment, 'purchaseIncrement');
  return Math.ceil((value - 1e-10) / increment) * increment;
}

/** Finds the catenary parameter from horizontal span and centre sag; stable bisection. */
function solveCatenary(spanCm, sagCm) {
  const span = positiveNumber(spanCm, 'spanDistance');
  const sag = positiveNumber(sagCm, 'sagDepth', true);
  if (sag === 0) return { a: Infinity, t: 0, length: span };
  if (sag > 3 * span) throw new RangeError('sagDepth must not exceed three times spanDistance');
  const ratio = (2 * sag) / span;
  let lo = 0, hi = 10;
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2;
    const candidate = mid < 1e-4 ? mid / 2 + (mid ** 3) / 24 : (Math.cosh(mid) - 1) / mid;
    if (candidate < ratio) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  const a = span / (2 * t);
  return { a, t, length: span * Math.sinh(t) / t };
}

/** Centre is -sag; ends are 0. x lies between -span/2 and +span/2. */
function catenaryDropAt(xCm, spanCm, sagCm) {
  if (Number(sagCm) === 0) return 0;
  const { a } = solveCatenary(spanCm, sagCm);
  return a * (Math.cosh(xCm / a) - Math.cosh(spanCm / (2 * a)));
}


const SHAPE_TYPES=['straight','arch','scallop','wave','diagonal'];
const RENDER_LOOKS={studio:{bg:['#e7eef6','#ffffff'],floor:'#dbe6f0',wall:'#f5f8fc'},wedding:{bg:['#f5f4f7','#ffffff'],floor:'#efe7e5',wall:'#fffafa'},contrast:{bg:['#dde7f0','#f8fbff'],floor:'#d0dce8',wall:'#f4f8fc'}};
const REFERENCE_PRESETS={
 'blue-center':{label:'Blue Center',render:{look:'wedding',showPerson:true,floralTop:true},frame:{spanCm:250,heightCm:260,bays:2},layers:[{name:'White Base',color:'#f5f6f7',opacity:100,widthCm:500,heightCm:250,fabricWidth:150,fullness:2,quantity:1,unitPrice:95,xOffsetCm:0,yOffsetCm:0,depthCm:0,curveType:'straight',curveDepthCm:0,curveRepeats:2,sweepCm:0,visible:true},{name:'Blue Left Sweep',color:'#b7d5ef',opacity:94,widthCm:240,heightCm:235,fabricWidth:150,fullness:1.8,quantity:1,unitPrice:125,xOffsetCm:-95,yOffsetCm:15,depthCm:10,curveType:'arch',curveDepthCm:42,curveRepeats:1,sweepCm:36,visible:true},{name:'Blue Right Sweep',color:'#b7d5ef',opacity:94,widthCm:240,heightCm:235,fabricWidth:150,fullness:1.8,quantity:1,unitPrice:125,xOffsetCm:95,yOffsetCm:15,depthCm:12,curveType:'arch',curveDepthCm:42,curveRepeats:1,sweepCm:-36,visible:true},{name:'Blue Center Drop',color:'#d4e6f6',opacity:92,widthCm:120,heightCm:250,fabricWidth:150,fullness:1.7,quantity:1,unitPrice:125,xOffsetCm:0,yOffsetCm:0,depthCm:18,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true}]},
 'pink-gold-cross':{label:'Pink + Gold Cross',render:{look:'wedding',showPerson:true,floralTop:false},frame:{spanCm:300,heightCm:270,bays:2},layers:[{name:'White Base',color:'#f5f6f7',opacity:100,widthCm:600,heightCm:270,fabricWidth:150,fullness:2,quantity:1,unitPrice:95,xOffsetCm:0,yOffsetCm:0,depthCm:0,curveType:'straight',curveDepthCm:0,curveRepeats:2,sweepCm:0,visible:true},{name:'Pink Cross',color:'#f2b8c8',opacity:95,widthCm:280,heightCm:255,fabricWidth:150,fullness:1.7,quantity:1,unitPrice:125,xOffsetCm:-95,yOffsetCm:5,depthCm:10,curveType:'diagonal',curveDepthCm:95,curveRepeats:1,sweepCm:58,visible:true},{name:'Champagne Cross',color:'#dbc39f',opacity:95,widthCm:280,heightCm:255,fabricWidth:150,fullness:1.7,quantity:1,unitPrice:135,xOffsetCm:95,yOffsetCm:5,depthCm:15,curveType:'diagonal',curveDepthCm:95,curveRepeats:1,sweepCm:-58,visible:true},{name:'Center Pink Drop',color:'#efabc5',opacity:92,widthCm:130,heightCm:270,fabricWidth:150,fullness:1.75,quantity:1,unitPrice:125,xOffsetCm:0,yOffsetCm:0,depthCm:22,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true}]},
 'white-scallop':{label:'White Scallop',render:{look:'studio',showPerson:true,floralTop:false},frame:{spanCm:250,heightCm:260,bays:2},layers:[{name:'White Base',color:'#f5f6f7',opacity:100,widthCm:500,heightCm:260,fabricWidth:150,fullness:2.1,quantity:1,unitPrice:95,xOffsetCm:0,yOffsetCm:0,depthCm:0,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true},{name:'Top Scallop',color:'#ffffff',opacity:98,widthCm:500,heightCm:125,fabricWidth:150,fullness:1.8,quantity:1,unitPrice:98,xOffsetCm:0,yOffsetCm:135,depthCm:10,curveType:'scallop',curveDepthCm:46,curveRepeats:3,sweepCm:0,visible:true},{name:'Lower Swag',color:'#fbfbfb',opacity:96,widthCm:500,heightCm:165,fabricWidth:150,fullness:1.8,quantity:1,unitPrice:98,xOffsetCm:0,yOffsetCm:0,depthCm:14,curveType:'scallop',curveDepthCm:34,curveRepeats:4,sweepCm:0,visible:true}]},
 'conference-top':{label:'Conference Top Drape',render:{look:'studio',showPerson:true,floralTop:false},frame:{spanCm:250,heightCm:280,bays:3},layers:[{name:'White Base',color:'#f5f6f7',opacity:100,widthCm:750,heightCm:280,fabricWidth:150,fullness:2,quantity:1,unitPrice:95,xOffsetCm:0,yOffsetCm:0,depthCm:0,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true},{name:'Top Valance',color:'#ffffff',opacity:97,widthCm:750,heightCm:115,fabricWidth:150,fullness:1.75,quantity:1,unitPrice:100,xOffsetCm:0,yOffsetCm:165,depthCm:12,curveType:'scallop',curveDepthCm:40,curveRepeats:4,sweepCm:0,visible:true}]},
 'magenta-cross':{label:'Magenta Cross',render:{look:'contrast',showPerson:true,floralTop:false},frame:{spanCm:250,heightCm:270,bays:2},layers:[{name:'White Side Base',color:'#ffffff',opacity:100,widthCm:520,heightCm:270,fabricWidth:150,fullness:2,quantity:1,unitPrice:95,xOffsetCm:0,yOffsetCm:0,depthCm:0,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true},{name:'Magenta Main',color:'#d91d73',opacity:96,widthCm:270,heightCm:270,fabricWidth:150,fullness:1.8,quantity:1,unitPrice:145,xOffsetCm:0,yOffsetCm:0,depthCm:10,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true},{name:'White Left Sweep',color:'#ffffff',opacity:98,widthCm:245,heightCm:240,fabricWidth:150,fullness:1.75,quantity:1,unitPrice:95,xOffsetCm:-105,yOffsetCm:10,depthCm:16,curveType:'arch',curveDepthCm:36,curveRepeats:1,sweepCm:58,visible:true},{name:'Magenta Right Sweep',color:'#df2c7e',opacity:95,widthCm:245,heightCm:240,fabricWidth:150,fullness:1.75,quantity:1,unitPrice:145,xOffsetCm:105,yOffsetCm:10,depthCm:18,curveType:'arch',curveDepthCm:36,curveRepeats:1,sweepCm:-58,visible:true}]},
 'pink-center':{label:'Pink Center Swag',render:{look:'wedding',showPerson:true,floralTop:false},frame:{spanCm:250,heightCm:250,bays:2},layers:[{name:'Pink Base',color:'#f4b7ce',opacity:100,widthCm:500,heightCm:250,fabricWidth:150,fullness:2,quantity:1,unitPrice:98,xOffsetCm:0,yOffsetCm:0,depthCm:0,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true},{name:'Pink Top Swag',color:'#f8d0de',opacity:92,widthCm:380,heightCm:140,fabricWidth:150,fullness:1.9,quantity:1,unitPrice:98,xOffsetCm:0,yOffsetCm:110,depthCm:10,curveType:'arch',curveDepthCm:55,curveRepeats:1,sweepCm:0,visible:true},{name:'Pink Center Drop',color:'#f1a9c4',opacity:90,widthCm:120,heightCm:250,fabricWidth:150,fullness:1.7,quantity:1,unitPrice:98,xOffsetCm:0,yOffsetCm:0,depthCm:16,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true}]},
 'mauve-wedding':{label:'Mauve Wedding',render:{look:'wedding',showPerson:true,floralTop:true},frame:{spanCm:300,heightCm:300,bays:2},layers:[{name:'Ivory Base',color:'#f8f5ef',opacity:100,widthCm:600,heightCm:300,fabricWidth:150,fullness:2,quantity:1,unitPrice:99,xOffsetCm:0,yOffsetCm:0,depthCm:0,curveType:'straight',curveDepthCm:0,curveRepeats:1,sweepCm:0,visible:true},{name:'Mauve Top Left',color:'#b38d8d',opacity:95,widthCm:280,heightCm:160,fabricWidth:150,fullness:1.8,quantity:1,unitPrice:132,xOffsetCm:-120,yOffsetCm:145,depthCm:12,curveType:'wave',curveDepthCm:28,curveRepeats:2,sweepCm:20,visible:true},{name:'Mauve Top Right',color:'#b38d8d',opacity:95,widthCm:280,heightCm:160,fabricWidth:150,fullness:1.8,quantity:1,unitPrice:132,xOffsetCm:120,yOffsetCm:145,depthCm:14,curveType:'wave',curveDepthCm:28,curveRepeats:2,sweepCm:-20,visible:true},{name:'Ivory Inner Sweep',color:'#fffdf8',opacity:95,widthCm:360,heightCm:235,fabricWidth:150,fullness:1.85,quantity:1,unitPrice:99,xOffsetCm:0,yOffsetCm:25,depthCm:20,curveType:'arch',curveDepthCm:55,curveRepeats:1,sweepCm:0,visible:true}]}};
function shapeProfile(type,u,repeats=2){
  const t=Math.max(0,Math.min(1,u)),r=Math.max(1,Math.min(6,Math.floor(Number(repeats)||2)));
  if(type==='arch')return Math.sin(Math.PI*t);
  if(type==='scallop')return Math.abs(Math.sin(Math.PI*r*t));
  if(type==='wave')return (1-Math.cos(2*Math.PI*r*t))/2;
  if(type==='diagonal')return t;
  return 0;
}
function curvedStripLength(heightCm,dropCm,sweepCm){
  const h=positiveNumber(heightCm,'heightCm'),d=positiveNumber(dropCm,'dropCm',true),s=Number(sweepCm)||0;
  if(!Number.isFinite(s))throw new RangeError('sweepCm must be finite');
  let distance=0,prevX=0,prevY=-(d),segments=64;
  for(let k=1;k<=segments;k++){
    const v=k/segments,x=s*Math.sin(Math.PI*v),y=-d+(h+d)*v;
    distance+=Math.hypot(x-prevX,y-prevY);prevX=x;prevY=y;
  }
  return distance;
}
function calculateShapedBackdrop(inputs,layer){
  const raw=calculateBackdrop(inputs),shape=SHAPE_TYPES.includes(layer.curveType)?layer.curveType:'straight';
  const depth=positiveNumber(layer.curveDepthCm??0,'curveDepthCm',true);
  if(depth>300)throw new RangeError('curveDepthCm must be ≤ 300');
  const sweep=Number(layer.sweepCm??0),repeats=Number(layer.curveRepeats??2);
  if(!Number.isFinite(sweep)||Math.abs(sweep)>150)throw new RangeError('sweepCm must be between -150 and 150');
  if(!Number.isInteger(repeats)||repeats<1||repeats>6)throw new RangeError('curveRepeats must be 1–6');
  if(shape==='straight'&&sweep===0)return {...raw,shapeType:'straight',maxCutLength:inputs.dimensions.backdropHeight};
  const cutLengths=[];let total=0;
  for(let i=0;i<raw.panelCount;i++){
    let longest=0;
    for(let k=0;k<=16;k++){
      const u=(i+k/16)/raw.panelCount,drop=depth*shapeProfile(shape,u,repeats);
      longest=Math.max(longest,curvedStripLength(inputs.dimensions.backdropHeight,drop,sweep));
    }
    cutLengths.push(longest);total+=longest;
  }
  return {...raw,theoreticalLength:total,cutLengths,shapeType:shape,maxCutLength:Math.max(...cutLengths),
    note:'Conservative rectangular strip lengths for parametric curved hem / sweep; not a validated fabric cutting pattern.'};
}

function calculateBackdrop(inputs) {
  const fabricWidth = positiveNumber(inputs.fabricWidth, 'fabricWidth');
  const fullnessRatio = positiveNumber(inputs.fullnessRatio, 'fullnessRatio');
  const backdropWidth = positiveNumber(inputs.dimensions?.backdropWidth, 'backdropWidth');
  const backdropHeight = positiveNumber(inputs.dimensions?.backdropHeight, 'backdropHeight');
  const panelCount = Math.ceil((backdropWidth * fullnessRatio) / fabricWidth);
  if (panelCount > 200) throw new RangeError('Backdrop exceeds 200 panels; split it into smaller layers');
  const theoreticalLength = panelCount * backdropHeight;
  return {
    theoreticalLength,
    panelCount,
    individualCutLength: backdropHeight,
    calculatedFabricWidth: backdropWidth * fullnessRatio,
    note: 'Theoretical length covers full-height unjoined panels without allowances.'
  };
}

function calculateCeilingDrape(inputs) {
  const fabricWidth = positiveNumber(inputs.fabricWidth, 'fabricWidth');
  const spanDistance = positiveNumber(inputs.dimensions?.spanDistance, 'spanDistance');
  const sagDepth = positiveNumber(inputs.dimensions?.sagDepth, 'sagDepth', true);
  const numberOfSwags = positiveNumber(inputs.dimensions?.numberOfSwags, 'numberOfSwags');
  if (!Number.isInteger(numberOfSwags) || numberOfSwags > 24) throw new RangeError('numberOfSwags must be an integer from 1 to 24');
  const method = inputs.dimensions?.calculationMethod === 'exact' ? 'exact' : 'brief';
  const approximatePerSwag = spanDistance * (1 + (sagDepth / spanDistance) * 0.6);
  const exactPerSwag = solveCatenary(spanDistance, sagDepth).length;
  const perSwagLength = method === 'exact' ? exactPerSwag : approximatePerSwag;
  return {
    theoreticalLength: perSwagLength * numberOfSwags,
    numberOfSwags,
    perSwagLength,
    approximatePerSwag,
    exactPerSwag,
    method,
    fabricWidth,
    note: method === 'brief' ? 'Brief formula is empirical; compare against mathematical catenary length.' : 'Exact catenary assumes equal-height endpoints.'
  };
}

function calculateElement(element, purchaseIncrement = 0.5) {
  if (!element || !['backdrop', 'ceilingDrape'].includes(element.type)) {
    throw new Error('Only backdrop and ceilingDrape are supported in Phase 1');
  }
  const buffers = normalizeBuffers(element.buffers);
  const raw = element.type === 'backdrop' ? calculateBackdrop(element.inputs) : calculateCeilingDrape(element.inputs);
  const totalBufferPercent = Object.values(buffers).reduce((sum, n) => sum + n, 0);
  const recommendedLength = raw.theoreticalLength * (1 + totalBufferPercent / 100);
  const theoreticalMeters = raw.theoreticalLength / 100;
  const recommendedMeters = recommendedLength / 100;
  const purchaseMeters = roundUpToIncrement(recommendedMeters, purchaseIncrement);
  const result = {
    ...raw,
    recommendedLength,
    theoreticalMeters,
    recommendedMeters,
    purchaseMeters,
    totalBufferPercent,
    additionalLength: recommendedLength - raw.theoreticalLength,
    purchaseIncrement,
  };
  return {
    id: element.id || 'element-1',
    type: element.type,
    inputs: structuredClone(element.inputs),
    buffers,
    result,
    sceneParams: {
      type: element.type,
      fabricWidth: element.inputs.fabricWidth,
      fullnessRatio: element.inputs.fullnessRatio,
      dimensions: { ...element.inputs.dimensions },
      panelCount: result.panelCount,
      calculationMethod: result.method,
      color: element.sceneParams?.color || '#c4d6ec',
    },
  };
}

function formatMeters(cm) {
  return (cm / 100).toFixed(2);
}


// --- project.js ---

const PALETTE = [
  ['#f5f6f7','ขาวนวล'],['#d8e5f1','ฟ้าหมอก'],['#97b4d4','ฟ้าคราม'],
  ['#244367','น้ำเงินเข้ม'],['#b8c8d3','เทาเงิน'],['#b9cbbf','เขียวเซจ'],
  ['#e9c6cf','ชมพูอ่อน'],['#cdbce4','ลาเวนเดอร์'],['#d9c5b2','แชมเปญ'],['#191e2a','ดำ']
];
const DEFAULT_PROJECT = {
  version:5, name:'Wedding Fabric Studio · Concept 01', type:'backdrop', increment:0.5,
  buffers:{seamBuffer:7,shrinkageBuffer:0,patternMatchBuffer:0,wastageBuffer:5},
  laborCost:0,otherCost:0,
  render:{look:'wedding',showPerson:true,floralTop:false},
  frame:{spanCm:250,heightCm:260,bays:2,beamProfile:"rhs-75-45-23",postProfile:"shs-50-50-23",braceProfile:"shs-40-40-20",fabricGsm:180,accessoryKg:8,beamPrice:470,postPrice:390,bracePrice:320,basePlateCount:6,basePlatePrice:90,includeBracing:true,showFrame:true},
  layers:[
    {id:'layer-base',name:'ผ้าหลัก · White Base',visible:true,color:'#f5f6f7',opacity:100,
      widthCm:500,heightCm:250,spanCm:400,sagCm:80,swags:3,method:'brief',fabricWidth:150,fullness:2,quantity:1,unitPrice:95,xOffsetCm:0,yOffsetCm:0,depthCm:0,curveType:'straight',curveDepthCm:0,curveRepeats:2,sweepCm:0},
    {id:'layer-accent',name:'ผ้าซ้อน · Soft Blue',visible:true,color:'#97b4d4',opacity:93,
      widthCm:260,heightCm:245,spanCm:400,sagCm:110,swags:3,method:'brief',fabricWidth:150,fullness:1.7,quantity:1,unitPrice:125,xOffsetCm:0,yOffsetCm:0,depthCm:14,curveType:'scallop',curveDepthCm:55,curveRepeats:2,sweepCm:0}
  ]
};

function finiteNumber(value,name,min=0) {
  const n=Number(value);
  if(!Number.isFinite(n)||n<min)throw new RangeError(`${name} must be ≥ ${min}`);
  return n;
}
function calculateLayer(layer,project) {
  if(!layer || !project) throw new TypeError('Project and layer are required');
  const quantity=finiteNumber(layer.quantity,'quantity',1);
  if(!Number.isInteger(quantity)||quantity>9999)throw new RangeError('quantity must be an integer ≤ 9999');
  const unitPrice=finiteNumber(layer.unitPrice,'unitPrice',0);
  const sceneParams={color:layer.color};
  const inputs={fabricWidth:layer.fabricWidth,fullnessRatio:layer.fullness,
    dimensions:project.type==='backdrop' ? {backdropWidth:layer.widthCm,backdropHeight:layer.heightCm}:
      {spanDistance:layer.spanCm,sagDepth:layer.sagCm,numberOfSwags:layer.swags,calculationMethod:layer.method}};
  const calculated=calculateElement({id:layer.id,type:project.type,inputs,buffers:project.buffers,sceneParams},project.increment);
  if(project.type==='backdrop'){
    const shaped=calculateShapedBackdrop(inputs,layer),buffer=calculated.result.totalBufferPercent;
    const raw=calculated.result;
    raw.theoreticalLength=shaped.theoreticalLength;raw.theoreticalMeters=shaped.theoreticalLength/100;
    raw.recommendedLength=shaped.theoreticalLength*(1+buffer/100);
    raw.recommendedMeters=raw.recommendedLength/100;
    raw.purchaseMeters=roundUpToIncrement(raw.recommendedMeters,project.increment);
    raw.additionalLength=raw.recommendedLength-raw.theoreticalLength;
    raw.shapeType=shaped.shapeType;raw.maxCutLength=shaped.maxCutLength;
    raw.note=shaped.note;
  }
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
function calculateProject(project) {
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

const STEEL_PROFILES={
 'shs-40-40-20':{w:40,h:40,t:2,label:'SHS 40×40×2.0 mm'},
 'shs-50-50-23':{w:50,h:50,t:2.3,label:'SHS 50×50×2.3 mm'},
 'rhs-75-45-23':{w:45,h:75,t:2.3,label:'RHS 75×45×2.3 mm (75 สูง)'},
 'shs-75-75-30':{w:75,h:75,t:3,label:'SHS 75×75×3.0 mm'},
 'rhs-100-50-30':{w:50,h:100,t:3,label:'RHS 100×50×3.0 mm (100 สูง)'},
 'shs-100-100-32':{w:100,h:100,t:3.2,label:'SHS 100×100×3.2 mm'}
};
const DEFAULT_FRAME={spanCm:250,heightCm:260,bays:2,beamProfile:'rhs-75-45-23',postProfile:'shs-50-50-23',braceProfile:'shs-40-40-20',fabricGsm:180,accessoryKg:8,beamPrice:470,postPrice:390,bracePrice:320,basePlateCount:6,basePlatePrice:90,includeBracing:true,showFrame:true};
function hollowSection(spec){
 const {w,h,t}=spec,area=w*h-(w-2*t)*(h-2*t);
 const inertia=(w*h**3-(w-2*t)*(h-2*t)**3)/12;
 return {areaMm2:area,inertiaMm4:inertia,kgPerM:area*.00785};
}
// First-fit decreasing counts 6 m raw tubes; this is a stock estimate, not a cut optimization certificate.
function countStockBars(cutsCm,stockCm=600){
 const remaining=[];
 for(const cut of [...cutsCm].sort((a,b)=>b-a)){
   if(!Number.isFinite(cut)||cut<=0||cut>stockCm)throw new RangeError('All unspliced steel members must fit a 6 m stock bar');
   const j=remaining.findIndex(r=>r+1e-8>=cut);
   if(j===-1)remaining.push(stockCm-cut);else remaining[j]-=cut;
 }
 return remaining.length;
}

function calculateFrameScreen(project,calculation){
 const f={...DEFAULT_FRAME,...project.frame},n=Number(f.bays),span=positiveNumber(f.spanCm,'frameSpanCm'),height=positiveNumber(f.heightCm,'frameHeightCm');
 if(!Number.isInteger(n)||n<1||n>12||span>600||height>600)throw new RangeError('Frame: 1–12 bays, beam and post length must be ≤ 600 cm');
 const gsm=positiveNumber(f.fabricGsm,'fabricGsm'),accessories=positiveNumber(f.accessoryKg,'accessoryKg',true),beam=STEEL_PROFILES[f.beamProfile],post=STEEL_PROFILES[f.postProfile],brace=STEEL_PROFILES[f.braceProfile];
 if(!beam||!post||!brace)throw new Error('Select listed steel tube profiles');
 const beamSec=hollowSection(beam),postSec=hollowSection(post),braceSec=hollowSection(brace);
 const fabricKg=calculation.items.reduce((s,item,i)=>s+item.theoreticalMeters*(project.layers[i].fabricWidth/100)*gsm/1000,0);
 const beamLengthM=span/100,beamSelfKg=beamSec.kgPerM*beamLengthM;
 const loadPerBayKg=(fabricKg+accessories)/n+beamSelfKg;
 const spanMm=span*10,w=loadPerBayKg*9.80665/spanMm;
 const bendingNmm=w*spanMm*spanMm/8,stressMpa=bendingNmm*(beam.h/2)/beamSec.inertiaMm4;
 const deflectionMm=5*w*(spanMm**4)/(384*200000*beamSec.inertiaMm4);
 const beamCuts=Array(n).fill(span),postCuts=Array(n+1).fill(height);
 const braceLen=Math.round(Math.hypot(span,height));
 const braceCuts=f.includeBracing?Array(n*2).fill(braceLen):[];
 const beamBars=countStockBars(beamCuts),postBars=countStockBars(postCuts),braceBars=braceCuts.length?countStockBars(braceCuts):0;
 const steelKg=n*beamLengthM*beamSec.kgPerM+(n+1)*(height/100)*postSec.kgPerM+braceCuts.length*(braceLen/100)*braceSec.kgPerM;
 const basePlateCount=Math.max(0,Math.round(Number(f.basePlateCount)||0)),basePlatePrice=positiveNumber(f.basePlatePrice,'basePlatePrice',true);
 const estimateSteelCost=beamBars*positiveNumber(f.beamPrice,'beamPrice',true)+postBars*positiveNumber(f.postPrice,'postPrice',true)+braceBars*positiveNumber(f.bracePrice,'bracePrice',true)+basePlateCount*basePlatePrice;
 const projectWidthCm=project.type==='backdrop'? Math.max(...project.layers.map(l=>l.widthCm+Math.abs(l.xOffsetCm||0)*2+Math.abs(l.sweepCm||0)*2)) : Math.max(...project.layers.map(l=>l.spanCm*l.swags+Math.abs(l.xOffsetCm||0)*2));
 return {spanCm:span,heightCm:height,bays:n,beam,post,brace,beamBars,postBars,braceBars,totalBars:beamBars+postBars+braceBars,steelKg,estimateSteelCost,spanCoverageCm:span*n,projectWidthCm,
  fabricKg,accessories,loadPerBayKg,bendingMpa:stressMpa,deflectionMm,beamDeflectionLimitVisualMm:spanMm/240,
  sideReactionKg:loadPerBayKg/2,beamSelfKg,braceLen,braceCount:braceCuts.length,basePlateCount,basePlatePrice,
  beamCuts,postCuts,braceCuts,
  note:'Preliminary uniformly loaded simple-beam gravity calculation only, not a safety/strength verification.'};
}


function estimatedImageRegion(bbox,referenceWidthCm,referenceHeightCm){
  const width=finiteNumber(referenceWidthCm,'referenceWidthCm',.01);
  const height=finiteNumber(referenceHeightCm,'referenceHeightCm',.01);
  const {x,y,w,h}=bbox||{};
  for(const [key,v] of Object.entries({x,y,w,h}))if(!Number.isFinite(v)||v<0||v>1)throw new RangeError(`${key} must be in [0,1]`);
  if(w===0||h===0||x+w>1.0000001||y+h>1.0000001)throw new RangeError('Region must fit in reference image');
  return {widthCm:w*width,heightCm:h*height,xOffsetCm:(x+w/2-.5)*width};
}
function roundBaht(amount){return Math.round((Number(amount)+Number.EPSILON)*100)/100;}



export { DEFAULT_PROJECT, DEFAULT_FRAME, REFERENCE_PRESETS, STEEL_PROFILES, solveCatenary, catenaryDropAt, shapeProfile, calculateProject, calculateLayer, calculateFrameScreen, countStockBars, roundUpToIncrement };
