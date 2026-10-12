/* Zero-dependency regression suite. Run: node tests/engine.test.cjs */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Embedded app script missing');
const engine = script.split('class LayeredRenderer')[0];
const checks = `
let ok = 0;
function test(name, run){ try{run();ok++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e);throw e;} }
const eq=(x,y,tol=1e-9)=>assert.ok(Math.abs(x-y)<tol, 'Expected '+x+' ≈ '+y);
const sample={fabricWidth:150,fullnessRatio:2,dimensions:{backdropWidth:500,backdropHeight:250}};
test('backdrop 7 panels',()=>assert.equal(calculateBackdrop(sample).panelCount,7));
test('backdrop 1750 cm',()=>eq(calculateBackdrop(sample).theoreticalLength,1750));
test('backdrop 12 percent buffer',()=>eq(calculateElement({id:'1',type:'backdrop',inputs:sample,buffers:DEFAULT_BUFFERS}).result.recommendedMeters,19.6));
test('backdrop order in 0.5m increments',()=>eq(calculateElement({id:'1',type:'backdrop',inputs:sample,buffers:DEFAULT_BUFFERS}).result.purchaseMeters,20));
test('ceiling empirical from brief',()=>eq(calculateCeilingDrape({fabricWidth:150,dimensions:{spanDistance:400,sagDepth:80,numberOfSwags:3,calculationMethod:'brief'}}).theoreticalLength,1344));
test('catenary zero sag = span',()=>eq(solveCatenary(400,0).length,400));
test('catenary depth positive',()=>assert.ok(solveCatenary(400,80).length>400));
test('straight cut unchanged',()=>eq(calculateShapedBackdrop(sample,{curveType:'straight',curveDepthCm:0,sweepCm:0,curveRepeats:2}).theoreticalLength,1750));
test('arch depth increases required cut',()=>assert.ok(calculateShapedBackdrop(sample,{curveType:'arch',curveDepthCm:60,sweepCm:0,curveRepeats:2}).theoreticalLength>1750));
test('sweep increases cut length',()=>assert.ok(curvedStripLength(250,0,50)>250));
test('invalid curve repeats rejected',()=>assert.throws(()=>calculateShapedBackdrop(sample,{curveType:'scallop',curveDepthCm:50,sweepCm:0,curveRepeats:15}),RangeError));
test('shape boundaries bounded 0..1',()=>{for(const kind of SHAPE_TYPES)for(let i=0;i<=100;i++){const y=shapeProfile(kind,i/100);assert.ok(y>=-1e-9&&y<=1+1e-9);}});
test('project separate layer rollup',()=>{const p=structuredClone(DEFAULT_PROJECT);const x=calculateProject(p);eq(x.totalCost,3150);eq(x.purchaseMeters,30);});
test('steel profile gross moment positive',()=>assert.ok(hollowSection(STEEL_PROFILES['rhs-75-45-23']).inertiaMm4>0));
test('one 6m bar for 4m + 2m',()=>assert.equal(countStockBars([400,200]),1));
test('two 6m bars for 3x 2.6m',()=>assert.equal(countStockBars([260,260,260]),2));
test('screen loads match projected fabric mass',()=>{const p=structuredClone(DEFAULT_PROJECT);const f=calculateFrameScreen(p,calculateProject(p));assert.ok(f.fabricKg>0);assert.equal(f.beamBars,1);assert.equal(f.postBars,2);});
test('longer spans deflect more',()=>{const p=structuredClone(DEFAULT_PROJECT);const c=calculateProject(p),s=calculateFrameScreen(p,c);p.frame.spanCm=400;assert.ok(calculateFrameScreen(p,c).deflectionMm>s.deflectionMm);});
test('weaker profile deflects more',()=>{const p=structuredClone(DEFAULT_PROJECT);const c=calculateProject(p),s=calculateFrameScreen(p,c);p.frame.beamProfile='shs-40-40-20';assert.ok(calculateFrameScreen(p,c).deflectionMm>s.deflectionMm);});
test('zero width rejected',()=>assert.throws(()=>calculateBackdrop({...sample,dimensions:{...sample.dimensions,backdropWidth:0}}),RangeError));
test('negative fabric price rejected',()=>{const p=structuredClone(DEFAULT_PROJECT);p.layers[0].unitPrice=-1;assert.throws(()=>calculateProject(p),RangeError);});
test('stock bar over 6 m rejected',()=>assert.throws(()=>countStockBars([601]),RangeError));
console.log('\\nALL',ok,'ENGINE TESTS PASSED');
`;
vm.runInNewContext(engine+checks,{console,assert,structuredClone,RangeError,Error,Math,Number,Object,Array,String});
