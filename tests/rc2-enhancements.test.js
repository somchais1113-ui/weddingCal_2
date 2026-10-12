import test from 'node:test';
import assert from 'node:assert/strict';
import {bezier,subdivideBezierAnchors,defaultAnchors} from '../src/geometry.js';
import {newLayer,newProject,validateProject} from '../src/model.js';
import {estimate} from '../src/fabric.js';

const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} differs from ${b}`);
test('RC2 subdivision retains original quadratic/Bezier path exactly',()=>{
 const points=[
  {x:0,y:0,role:'hang',out:{x:.12,y:-.25}},
  {x:.45,y:.24,role:'gather',in:{x:.23,y:.3},out:{x:.65,y:.18}},
  {x:1,y:0,role:'hang',in:{x:.75,y:-.14}}
 ];
 const parts=subdivideBezierAnchors(points);
 assert.equal(parts.length,5);
 for(let s=0;s<points.length-1;s++)for(let i=0;i<=100;i++){
  const t=i/100,original=bezier(points[s],points[s+1],t);
  const idx=s*2+(t<=.5?0:1),local=t<=.5?t*2:(t-.5)*2;
  const next=bezier(parts[idx],parts[idx+1],local);
  near(original.x,next.x);near(original.y,next.y);
 }
});
test('RC2 can subdivide 2 to 65 anchors but stops before exceeding 120',()=>{
 let pts=defaultAnchors().top;
 for(const expected of [3,5,9,17,33,65]){pts=subdivideBezierAnchors(pts);assert.equal(pts.length,expected);}
 assert.throws(()=>subdivideBezierAnchors(pts),/120/);
});
test('RC2 traced layer supports 120 anchors per edge with numeric material estimate',()=>{
 const project=newProject();const l=newLayer({shape:'trace',name:'Tiny detailed part',widthCm:25,heightCm:50,anchors:{top:[],bottom:[]}});
 for(let i=0;i<120;i++){
  const x=i/119;
  l.anchors.top.push({x,y:0,role:'hang'});
  l.anchors.bottom.push({x,y:1,role:'release'});
 }
 project.layers=[l];
 validateProject(project);
 const r=estimate(project);
 assert.ok(r.fabric[0].purchaseMeters>0);
 assert.ok(Number.isFinite(r.fabric[0].fabricCost));
});
