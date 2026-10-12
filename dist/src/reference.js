import {rectifyImage} from './calibration.js';
import {outlineAt,clamp} from './geometry.js';
export async function imageFromUrl(url){const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('ไม่สามารถเปิดภาพนี้ได้'));img.src=url;});return img;}
export async function readImage(file){if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('รองรับ JPG, PNG และ WEBP เท่านั้น');if(file.size>16*1024*1024)throw new Error('ภาพต้องไม่เกิน 16 MB');const url=await new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=rej;reader.readAsDataURL(file);});const img=await imageFromUrl(url);const c=document.createElement('canvas'),scale=Math.min(1,1800/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.92);}
export class ReferenceEditor{
 constructor(canvas,callbacks){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.callbacks=callbacks;this.original=false;this.overlay=true;this.mode='edit';this.edge='top';this.active=null;new ResizeObserver(()=>this.draw()).observe(canvas);
  canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>{if(this.drag)this.callbacks.commit();this.drag=null;});
 }
 async setImage(url){this.image=url?await imageFromUrl(url):null;this.rectified=null;this.draw();}
 set(project,layer){this.project=project;this.layer=layer;this.draw();}
 rectify(){const r=this.project.reference;if(!this.image)throw new Error('อัปโหลดภาพก่อน');this.rectified=rectifyImage(this.image,r.quad,r.width,r.height);this.original=false;this.mode='edit';this.draw();}
 locate(e){const r=this.canvas.getBoundingClientRect();return {x:(e.clientX-r.left-this.box.x)/this.box.w,y:(e.clientY-r.top-this.box.y)/this.box.h};}
 layerPoint(a){const l=this.layer,r=this.project.reference;return {x:(l.x-l.widthCm/2+a.x*l.widthCm+r.width/2)/r.width,y:(l.y+a.y*l.heightCm)/r.height};}
 fromScene(p){const l=this.layer,r=this.project.reference;return {x:(p.x*r.width-r.width/2-l.x+l.widthCm/2)/l.widthCm,y:(p.y*r.height-l.y)/l.heightCm};}
 down(e){if(!this.image||!this.box)return;this.canvas.focus();this.canvas.setPointerCapture(e.pointerId);const p=this.locate(e);if(p.x<0||p.x>1||p.y<0||p.y>1)return;
  if(this.mode==='calibrate'){
   const q=this.project.reference.quad,i=q.findIndex(a=>Math.hypot((p.x-a.x)*this.box.w,(p.y-a.y)*this.box.h)<15);
   if(i>=0)this.drag={corner:i};else if(q.length<4){q.push(p);this.callbacks.commit();}this.draw();return;
  }
  if(!this.project.reference.calibrated||this.original||this.layer?.shape!=='trace'||this.layer.locked)return;
  if(this.mode==='add'){const pts=this.layer.anchors[this.edge];if(pts.length>=30)return;const a=this.fromScene(p);a.role=this.edge==='top'?'hang':'release';pts.push(a);pts.sort((a,b)=>a.x-b.x);this.active={edge:this.edge,index:pts.indexOf(a)};this.mode='edit';this.callbacks.change();this.callbacks.commit();this.draw();return;}
  let best=null,dist=16;for(const hit of this.handles||[]){const d=Math.hypot((p.x-hit.point.x)*this.box.w,(p.y-hit.point.y)*this.box.h);if(d<dist){best=hit;dist=d;}}
  if(best){this.active={edge:best.edge,index:best.index};this.drag=best;this.callbacks.select?.(this.active);this.draw();}
 }
 move(e){if(!this.drag)return;const p=this.locate(e);
  if(this.drag.corner!==undefined){this.project.reference.quad[this.drag.corner]={x:clamp(p.x,0,1),y:clamp(p.y,0,1)};this.project.reference.calibrated=false;this.draw();return;}
  const d=this.drag,a=this.layer.anchors[d.edge][d.index],next=this.fromScene(p);
  if(d.handle){a[d.handle]=next;}else{const dx=next.x-a.x,dy=next.y-a.y;for(const key of ['in','out'])if(a[key]){a[key].x+=dx;a[key].y+=dy;}a.x=next.x;a.y=next.y;}
  this.callbacks.change();this.draw();
 }
 draw(){const {canvas,ctx,project:p}=this;if(!p)return;const rect=canvas.getBoundingClientRect();if(rect.width<1)return;const W=rect.width,H=rect.height,dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#eef2f7';ctx.fillRect(0,0,W,H);this.handles=[];
  const img=this.original||this.mode==='calibrate'?this.image:this.rectified||this.image;if(!img){ctx.fillStyle='#7b91a8';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('อัปโหลดภาพเพื่อเริ่มถอดแบบ',W/2,H/2);ctx.textAlign='left';return;}
  const scale=Math.min((W-36)/img.width,(H-75)/img.height),w=img.width*scale,h=img.height*scale;this.box={x:(W-w)/2,y:(H-h)/2+9,w,h};const b=this.box;ctx.drawImage(img,b.x,b.y,b.w,b.h);const toPx=a=>[b.x+a.x*b.w,b.y+a.y*b.h];
  if(this.mode==='calibrate'||this.original){const q=p.reference.quad;ctx.strokeStyle='#3685c8';ctx.lineWidth=2;ctx.beginPath();q.forEach((a,i)=>{const [x,y]=toPx(a);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});if(q.length===4)ctx.closePath();ctx.stroke();q.forEach((a,i)=>{const [x,y]=toPx(a);ctx.fillStyle='#1b4d79';ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='white';ctx.font='11px sans-serif';ctx.fillText(String(i+1),x-3,y+4);});return;}
  if(!p.reference.calibrated||!this.overlay)return;
  const drawLine=(points,color,dash=[])=>{ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.setLineDash(dash);ctx.beginPath();points.forEach((a,i)=>{const [x,y]=toPx(a);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.setLineDash([]);};
  for(const l of p.layers){if(!l.visible)continue;for(const edge of [0,1]){const points=[];for(let k=0;k<=100;k++){const a=outlineAt(l,k/100)[edge];points.push({x:(l.x-l.widthCm/2+a.x+p.reference.width/2)/p.reference.width,y:(l.y+a.y)/p.reference.height});}drawLine(points,l.id===this.layer?.id?'#147ebe':'#ffffff90',l.id===this.layer?.id?[]:[4,4]);}}
  const l=this.layer;if(l?.shape!=='trace')return;
  for(const edge of ['top','bottom'])l.anchors[edge].forEach((a,index)=>{
   const point=this.layerPoint(a),[x,y]=toPx(point),active=this.active?.edge===edge&&this.active?.index===index;
   if(active&&l.curve==='bezier'){for(const key of ['in','out'])if(a[key]){const hp=this.layerPoint(a[key]),[hx,hy]=toPx(hp);drawLine([point,hp],'#eba642');ctx.fillStyle='#f3ae48';ctx.fillRect(hx-4,hy-4,8,8);this.handles.push({point:hp,edge,index,handle:key});}}
   ctx.fillStyle=active?'#f3ac45':edge==='top'?'#206594':'#fff';ctx.strokeStyle='#195f90';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.stroke();this.handles.push({point,edge,index});
  });
 }
}
