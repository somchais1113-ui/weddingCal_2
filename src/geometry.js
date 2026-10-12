import {solveCatenary,shapeProfile} from './legacy-engine.js';
const catCache=new Map();
function cachedCatenary(span,sag){const key=span+':'+sag;if(!catCache.has(key)){if(catCache.size>100)catCache.clear();catCache.set(key,solveCatenary(span,sag));}return catCache.get(key);}
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
export function bezier(a,b,t){const q=1-t,c=a.out||a,d=b.in||b;return {x:q*q*q*a.x+3*q*q*t*c.x+3*q*t*t*d.x+t*t*t*b.x,y:q*q*q*a.y+3*q*q*t*c.y+3*q*t*t*d.y+t*t*t*b.y};}
export function edgePoint(points,t,curve='bezier',sag=0){
 if(points.length<2)throw new Error('เส้นขอบต้องมี Anchor อย่างน้อย 2 จุด');
 const f=clamp(t,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(f)),u=f-i,a=points[i],b=points[i+1];
 if(curve==='catenary'){
  const span=Math.abs(b.x-a.x);if(span<.0001||sag<=0)return {x:mix(a.x,b.x,u),y:mix(a.y,b.y,u)};
  const cat=cachedCatenary(span,Math.min(sag,span*3));
  return {x:mix(a.x,b.x,u),y:mix(a.y,b.y,u)+cat.a*(Math.cosh(cat.t)-Math.cosh((u-.5)*span/cat.a))};
 }return bezier(a,b,u);
}
/** Split all cubic Bezier spans at t=.5 without changing their geometric path. */
export function subdivideBezierAnchors(points){
 if(!Array.isArray(points)||points.length<2||points.length*2-1>120)throw new Error('Anchor ต่อเส้นต้องมี 2–120 จุด');
 const lerp=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 const output=[structuredClone(points[0])];
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],p01=lerp(a,a.out||a),p12=lerp(a.out||a,b.in||b),p23=lerp(b.in||b,b);
  const p012=lerp(p01,p12),p123=lerp(p12,p23),m=lerp(p012,p123);
  output[output.length-1].out=p01;
  output.push({x:m.x,y:m.y,role:a.role||'hang',in:p012,out:p123});
  const next=structuredClone(b);next.in=p23;output.push(next);
 }
 return output;
}
export function defaultAnchors(){return {top:[{x:0,y:0,role:'hang'},{x:1,y:0,role:'hang'}],bottom:[{x:0,y:1,role:'release'},{x:1,y:1,role:'release'}]};}
export function outlineAt(layer,u){
 const w=layer.widthCm,h=layer.heightCm;
 if(layer.shape==='trace'){
  const scaled=points=>points.map(p=>({...p,x:p.x*w,y:p.y*h,...(p.in?{in:{x:p.in.x*w,y:p.in.y*h}}:{}),...(p.out?{out:{x:p.out.x*w,y:p.out.y*h}}:{})}));
  return [edgePoint(scaled(layer.anchors.top),u,layer.curve,layer.sagCm),edgePoint(scaled(layer.anchors.bottom),u,layer.curve,layer.sagCm)];
 }
 const sag=layer.sagCm||0,r=layer.repeats||2;let top=0,bottom=h;
 if(layer.shape==='swag'){const cat=cachedCatenary(w,Math.min(sag,w*3));top=sag?cat.a*(Math.cosh(cat.t)-Math.cosh((u-.5)*w/cat.a)):0;bottom=top+h;}
 if(layer.shape==='scallop')bottom=h+sag*Math.abs(Math.sin(Math.PI*r*u));
 if(layer.shape==='arch')bottom=h-sag*Math.sin(Math.PI*u);
 if(layer.shape==='cross'){const t=layer.direction===-1?1-u:u;top=sag*t;bottom=h+sag*t;}
 if(layer.shape==='legacy')bottom=h+(layer.curveDepthCm||0)*shapeProfile(layer.curveType,u,layer.curveRepeats);
 return [{x:u*w,y:top},{x:u*w,y:bottom}];
}
export function surfacePoint(l,u,v,{folds=true,world=true}={}){
 if(l.mode==='ceilingDrape'){
  const span=l.spanCm,swags=l.swags,x=u*span*swags,part=Math.min(swags-1,Math.floor(u*swags)),q=u*swags-part,cat=cachedCatenary(span,l.sagCm),drop=l.sagCm?cat.a*(Math.cosh(cat.t)-Math.cosh((q-.5)*span/cat.a)):0;
  return [(world?l.x-span*swags/2:0)+x,(world?l.y:0)+drop+(folds?1.3*Math.sin(v*Math.PI*10)*Math.sin(q*Math.PI):0),(world?l.z:0)+(v-.5)*l.fabricWidth];
 }
 const [a,b]=outlineAt(l,u);let x=mix(a.x,b.x,v),y=mix(a.y,b.y,v);
 if(l.shape==='side'||l.shape==='legacy')x+=(l.sweepCm||0)*Math.sin(Math.PI*v);
 if(l.shape==='center')x=l.widthCm/2+(x-l.widthCm/2)*(1-.78*Math.exp(-(((v-.52)/.19)**2)));
 let z=(l.depth||0)*Math.sin(Math.PI*v)*Math.sin(Math.PI*u);
 if(folds){const count=clamp(Math.round(l.widthCm*l.fullness/18),8,100);z+=(Math.sin(u*count*Math.PI*2)+.2*Math.sin(u*count*Math.PI*4+.7))*Math.min(4,Math.max(.2,(l.fullness-1)*2))*(.35+.65*v);}
 return [x+(world?l.x-l.widthCm/2:0),y+(world?l.y:0),z+(world?l.z:0)];
}
export function mesh(l,quality='high'){
 const nx=quality==='low'?36:88,ny=quality==='low'?14:28,vertices=[],faces=[];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)vertices.push(surfacePoint(l,i/nx,j/ny));
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;faces.push([a,c,b],[b,c,d]);}
 return {vertices,faces};
}
/** Length of longitudinal strips excluding pleats: fullness is handled across roll width. */
export function stripLength(l,u){let prev=surfacePoint(l,u,0,{folds:false,world:false}),len=0;for(let i=1;i<=80;i++){const p=surfacePoint(l,u,i/80,{folds:false,world:false});len+=Math.hypot(...p.map((n,j)=>n-prev[j]));prev=p;}return len;}
export function cutEnvelope(l,panel,count){let max=0;for(let k=0;k<=40;k++)max=Math.max(max,stripLength(l,(panel+k/40)/count));return max;}

export function developedWidth(l){let max=0;for(let j=0;j<=8;j++){let len=0,prev=surfacePoint(l,0,j/8,{folds:false,world:false});for(let i=1;i<=160;i++){const p=surfacePoint(l,i/160,j/8,{folds:false,world:false});len+=Math.hypot(...p.map((n,k)=>n-prev[k]));prev=p;}max=Math.max(max,len);}return max;}
