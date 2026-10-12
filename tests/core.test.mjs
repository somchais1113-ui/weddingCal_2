import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateElement, calculateBackdrop, calculateCeilingDrape, catenaryDropAt, solveCatenary, roundUpToIncrement } from '../assets/engine.js';

const backdrop = { id:'test', type:'backdrop', inputs:{ fabricWidth:150, fullnessRatio:2, dimensions:{ backdropWidth:500, backdropHeight:250 } }, buffers:{ seamBuffer:7, shrinkageBuffer:0, patternMatchBuffer:0, wastageBuffer:5 } };
const ceiling = { id:'ceiling', type:'ceilingDrape', inputs:{ fabricWidth:150, fullnessRatio:2, dimensions:{ spanDistance:400, sagDepth:80, numberOfSwags:3, calculationMethod:'brief' } }, buffers:{ seamBuffer:7, shrinkageBuffer:0, patternMatchBuffer:0, wastageBuffer:5 } };

test('brief example: 500cm × 250cm at fullness 2, width 150cm -> 7 panels / 17.5m', () => {
  const result = calculateElement(backdrop);
  assert.equal(result.result.panelCount, 7);
  assert.equal(result.result.theoreticalMeters, 17.5);
  assert.ok(Math.abs(result.result.recommendedMeters - 19.6) < 1e-10);
  assert.equal(result.result.purchaseMeters, 20);
});
test('buffer is applied only once and line items sum in percent points', () => {
  const r=calculateElement({...backdrop,buffers:{seamBuffer:5,shrinkageBuffer:3,patternMatchBuffer:10,wastageBuffer:5}}).result;
  assert.equal(r.totalBufferPercent,23);
  assert.ok(Math.abs(r.recommendedMeters-21.525)<1e-10);
});
test('brief ceiling formula is exactly span + 0.6*sag per swag',()=>{
  const r=calculateElement(ceiling).result;
  assert.ok(Math.abs(r.perSwagLength-448)<1e-8);
  assert.ok(Math.abs(r.theoreticalLength-1344)<1e-8);
});
test('catenary endpoints, midpoint and arc length are physically consistent',()=>{
  const span=400,sag=80;
  assert.ok(Math.abs(catenaryDropAt(-span/2,span,sag)) < 1e-9);
  assert.ok(Math.abs(catenaryDropAt(span/2,span,sag)) < 1e-9);
  assert.ok(Math.abs(catenaryDropAt(0,span,sag)+sag)<1e-9);
  const {length}=solveCatenary(span,sag);
  assert.ok(length > span);
  const r=calculateCeilingDrape({...ceiling.inputs,dimensions:{...ceiling.inputs.dimensions,calculationMethod:'exact'}});
  assert.ok(Math.abs(r.theoreticalLength-length*3)<1e-7);
});
test('zero sag is straight and exact catenary length equals span',()=>{
  assert.equal(solveCatenary(400,0).length,400);
  assert.equal(catenaryDropAt(0,400,0),0);
});
test('reject invalid dimensions, negative buffers and unknown element types',()=>{
  assert.throws(()=>calculateBackdrop({...backdrop.inputs, fabricWidth:0}),RangeError);
  assert.throws(()=>calculateElement({...backdrop,buffers:{seamBuffer:-1}}),RangeError);
  assert.throws(()=>calculateElement({...backdrop,type:'chairSash'}));
  assert.throws(()=>calculateCeilingDrape({...ceiling.inputs,dimensions:{...ceiling.inputs.dimensions,numberOfSwags:2.4}}),RangeError);
});
test('increment rounding does not under-order',()=>{
  assert.equal(roundUpToIncrement(19.6,0.5),20);
  assert.equal(roundUpToIncrement(19.5,0.5),19.5);
  assert.equal(roundUpToIncrement(19.51,1),20);
});
