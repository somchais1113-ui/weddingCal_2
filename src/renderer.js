import {mesh,clamp} from './geometry.js';
const rgb=c=>/^#[\da-f]{6}$/i.test(c)?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):[180,205,225];
export class Renderer{
 constructor(canvas,{onSelect,onMove,onCommit}={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.angle=-.18;this.pitch=.08;this.zoom=1;this.pan=[0,0];this.tool='orbit';this.cache=new Map();this.hits=[];this.callbacks={onSelect,onMove,onCommit};this.camera='perspective';
  new ResizeObserver(()=>this.draw()).observe(canvas);
  canvas.addEventListener('pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect(),hit=this.pick(e.clientX-r.left,e.clientY-r.top);if(hit)onSelect?.(hit);this.drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,move:false,hit};});
  canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>3)d.move=true;
   if(this.tool==='move'&&d.hit){if(this.camera!=='front')return;onMove?.(dx/this.scale,dy/this.scale);}
   else if(this.tool==='pan'||e.shiftKey){this.pan[0]+=dx;this.pan[1]+=dy;this.draw();}
   else {this.camera='perspective';this.angle+=dx*.008;this.pitch=clamp(this.pitch+dy*.006,-1.5,1.5);this.draw();}
  });
  const end=()=>{if(this.drag?.move&&this.tool==='move')onCommit?.();this.drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom*Math.exp(-e.deltaY*.001),.25,4);this.draw();},{passive:false});
 }
 set(p,selected){this.project=p;this.selected=selected;this.draw();}
 view(name){this.camera=name;this.angle=name==='side'?Math.PI/2:name==='perspective'?-.18:0;this.pitch=name==='top'?Math.PI/2:name==='perspective'?.08:0;this.pan=[0,0];this.zoom=1;this.draw();}
 projectPoint([x,y,z]){
  const {width,height}=this.project,co=Math.cos(this.angle),si=Math.sin(this.angle),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch),cx=x*co+z*si,cz=-x*si+z*co,yy=y-height/2,cy=yy*cp+cz*sp,depth=-yy*sp+cz*cp;
  const factor=this.camera==='perspective'?clamp(1+depth/2200,.65,1.6):1;
  return [this.W/2+this.pan[0]+cx*this.scale*factor,this.H*.46+this.pan[1]+cy*this.scale*factor,depth];
 }
 pick(x,y){for(let i=this.hits.length-1;i>=0;i--){const f=this.hits[i],[a,b,c]=f.p;const cross=(p,q)=>(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]);const v=[cross(a,b),cross(b,c),cross(c,a)];if(v.every(n=>n>=0)||v.every(n=>n<=0))return f.id;}return null;}
 draw(){
  if(!this.project)return;const {canvas,ctx,project:p}=this,r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;
  const dpr=Math.min(devicePixelRatio||1,2);this.W=r.width;this.H=r.height;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=r.width,H=r.height;const visible=p.layers.filter(l=>l.visible),extentW=Math.max(p.width,...visible.map(l=>Math.abs(l.x)*2+(l.mode==='ceilingDrape'?l.spanCm*l.swags:l.widthCm)+Math.abs(l.sweepCm||0)*2)),extentH=Math.max(p.height,...visible.map(l=>Math.abs(l.y)+l.heightCm+(l.shape==='swag'||l.shape==='scallop'?l.sagCm:0)));this.scale=Math.min(W/(extentW+200),H/(extentH+150))*this.zoom;
  ctx.fillStyle=p.render.look==='presentation'?'#eef3f9':'#f8fafc';ctx.fillRect(0,0,W,H);
  const P=v=>this.projectPoint(v),line=(a,b,color='#dce5ee',width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();};
  for(let x=-p.width;x<=p.width;x+=50)line(P([x,p.height,-250]),P([x,p.height,300]));
  for(let z=-250;z<=300;z+=50)line(P([-p.width,p.height,z]),P([p.width,p.height,z]));
  if(p.render.frame){for(const x of [-p.width/2,0,p.width/2])line(P([x,0,-12]),P([x,p.height,-12]),'#a0afc0',3);line(P([-p.width/2,0,-12]),P([p.width/2,0,-12]),'#9baabd',3);}
  const faces=[];this.hits=[];const quality=p.render.quality==='auto'?(W<650||p.layers.length>12?'low':'high'):p.render.quality;
  p.layers.forEach((l,index)=>{
   if(!l.visible)return;const key=JSON.stringify([l,quality]);let geom=this.cache.get(l.id);if(geom?.key!==key){geom={key,...mesh(l,quality)};this.cache.set(l.id,geom);}
   const projected=geom.vertices.map(P),col=rgb(l.color);
   for(const f of geom.faces){const pts=f.map(i=>projected[i]),[a,b,c]=f.map(i=>geom.vertices[i]),u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],mag=Math.hypot(...n)||1;
    const diffuse=Math.abs((n[0]*.28-n[1]*.3+n[2]*.91)/mag),clean=p.render.look==='clean',tone=(clean?.86:.75)+diffuse*(clean?.16:.27),sheen=(1-l.roughness)*Math.pow(diffuse,12)*15;
    faces.push({id:l.id,p:pts,depth:pts.reduce((s,p)=>s+p[2],0)/3+index*.001,color:`rgb(${col.map(c=>Math.round(clamp(c*tone+sheen,0,255))).join(',')})`,alpha:l.opacity/100*(1-l.transmission*.55)});
   }
  });
  faces.sort((a,b)=>a.depth-b.depth);
  for(const f of faces){ctx.globalAlpha=f.alpha;ctx.fillStyle=f.color;ctx.strokeStyle=f.color;ctx.lineWidth=.4;ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();if(f.alpha>.98)ctx.stroke();if(f.alpha>.05)this.hits.push(f);}
  ctx.globalAlpha=1;
  const selected=p.layers.find(l=>l.id===this.selected);if(selected?.visible){const g=this.cache.get(selected.id),nx=quality==='low'?36:88,ny=quality==='low'?14:28;ctx.strokeStyle='#5a8ebc';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();let first=true;for(const i of [...Array.from({length:nx+1},(_,i)=>i),...Array.from({length:ny},(_,j)=>(j+1)*(nx+1)+nx),...Array.from({length:nx},(_,i)=>ny*(nx+1)+nx-i-1),...Array.from({length:ny},(_,j)=>(ny-j-1)*(nx+1))]){const a=P(g.vertices[i]);first?ctx.moveTo(a[0],a[1]):ctx.lineTo(a[0],a[1]);first=false;}ctx.closePath();ctx.stroke();ctx.setLineDash([]);}
  if(p.render.floral){for(let i=0;i<32;i++){const a=P([-p.width/2+i*p.width/31,-4,45]);ctx.fillStyle=i%2?'#b7cfdf':'#e6edf6';ctx.beginPath();ctx.arc(a[0],a[1],4+(i%3),0,Math.PI*2);ctx.fill();}}
  if(p.render.person){const h=p.render.personHeight,x=p.width/2+62,z=40,pts=[[x,p.height-h+22,z],[x,p.height-67,z]],head=P([x,p.height-h+11,z]);ctx.strokeStyle='#8497ac';ctx.fillStyle='#dce4ed';ctx.lineWidth=Math.max(1,this.scale*3);ctx.beginPath();ctx.arc(head[0],head[1],Math.max(4,11*this.scale),0,Math.PI*2);ctx.fill();line(P(pts[0]),P(pts[1]),'#91a2b5',Math.max(3,19*this.scale));for(const dx of [-1,1]){line(P([x,p.height-h+40,z]),P([x+dx*22,p.height-h+92,z]),'#91a2b5',5*this.scale);line(P(pts[1]),P([x+dx*17,p.height,z]),'#91a2b5',7*this.scale);}ctx.font='11px sans-serif';ctx.fillStyle='#647a92';const ft=P([x,p.height+18,z]);ctx.fillText(`${h} ซม.`,ft[0]-18,ft[1]);}
  ctx.fillStyle='#64748b';ctx.font='11px sans-serif';ctx.fillText(`${p.width} × ${p.height} ซม.  ·  ${quality==='low'?'ประหยัด':'ละเอียด'}`,18,H-18);
 }
}
