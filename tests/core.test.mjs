import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateProject,calculateLayer,estimatedImageRegion,DEFAULT_PROJECT} from '../assets/project.js';
import {calculateElement,solveCatenary} from '../assets/engine.js';
const copy=o=>structuredClone(o);
test('brief example 500x250, 150 fabric, fullness 2 gives 7 panels and 17.50m',()=>{
 const p=copy(DEFAULT_PROJECT);const a=calculateLayer(p.layers[0],p);
 assert.equal(a.perUnit.panelCount,7);assert.equal(a.theoreticalMeters,17.5);
 assert.equal(a.purchaseMeters,20);assert.equal(a.fabricCost,1900);
});
test('cost and meter totals sum across two separately rounded layers',()=>{
 const p=copy(DEFAULT_PROJECT);const r=calculateProject(p);
 assert.equal(r.items.length,2);
 assert.equal(r.fabricSubtotal,r.items[0].fabricCost+r.items[1].fabricCost);
 assert.equal(r.totalCost,r.fabricSubtotal);
 assert.ok(r.purchaseMeters>=r.recommendedMeters);
});
test('quantity expands fabric length BEFORE rounding each layer',()=>{
 const p=copy(DEFAULT_PROJECT);p.layers=p.layers.slice(0,1);p.layers[0].quantity=3;
 const r=calculateProject(p),base=calculateLayer({...p.layers[0],quantity:1},p);
 assert.equal(r.items[0].theoreticalMeters,52.5);
 assert.ok(Math.abs(r.items[0].recommendedMeters-58.8)<1e-9);
 assert.equal(r.items[0].purchaseMeters,59);
 assert.notEqual(r.items[0].purchaseMeters,base.purchaseMeters*3);
});
test('buffers are applied just once and can vary',()=>{
 const p=copy(DEFAULT_PROJECT);p.layers=p.layers.slice(0,1);p.buffers={seamBuffer:5,shrinkageBuffer:3,patternMatchBuffer:10,wastageBuffer:5};
 assert.ok(Math.abs(calculateProject(p).items[0].recommendedMeters-21.525)<1e-9);
});
test('labor and other costs are added after material cost',()=>{
 const p=copy(DEFAULT_PROJECT);p.laborCost=1300;p.otherCost=450;
 const r=calculateProject(p);assert.equal(r.totalCost,r.fabricSubtotal+1750);
});
test('ceiling approximate per swag and exact physical curve',()=>{
 const p=copy(DEFAULT_PROJECT);p.type='ceilingDrape';p.layers=p.layers.slice(0,1);
 const r=calculateLayer(p.layers[0],p);assert.ok(Math.abs(r.theoreticalMeters-13.44)<1e-10);
 p.layers[0].method='exact';const exact=calculateLayer(p.layers[0],p);
 assert.ok(Math.abs(exact.theoreticalMeters-solveCatenary(400,80).length*3/100)<1e-10);
});
test('photo rectangle calibrated into real centimetres',()=>{
 const region=estimatedImageRegion({x:.2,y:.1,w:.4,h:.8},500,250);
 assert.equal(region.widthCm,200);assert.equal(region.heightCm,200);assert.ok(Math.abs(region.xOffsetCm+50)<1e-9);
 assert.throws(()=>estimatedImageRegion({x:.9,y:.2,w:.5,h:.2},500,250),RangeError);
});
test('reject invalid unit price, zero width, invalid quantity',()=>{
 const p=copy(DEFAULT_PROJECT);
 assert.throws(()=>calculateLayer({...p.layers[0],unitPrice:-1},p),RangeError);
 assert.throws(()=>calculateLayer({...p.layers[0],quantity:1.5},p),RangeError);
 assert.throws(()=>calculateLayer({...p.layers[0],widthCm:0},p),RangeError);
});
test('changing one layer color does not affect consumption or cost',()=>{
 const p=copy(DEFAULT_PROJECT);const initial=calculateProject(p);p.layers[1].color='#ffffff';
 assert.equal(calculateProject(p).totalCost,initial.totalCost);
});
test('zero costs supported and order increment adjustable',()=>{
 const p=copy(DEFAULT_PROJECT);p.increment=1;p.layers=p.layers.slice(0,1);p.layers[0].unitPrice=0;
 assert.equal(calculateProject(p).totalCost,0);
});
