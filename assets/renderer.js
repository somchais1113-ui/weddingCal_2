import { solveCatenary } from './engine.js';

export class FabricRenderer {
 constructor(canvas) {
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.angle=0.30;this.pitch=.18;this.zoom=1;
  this.model=null;this.data=null;this.dragged=false;
  canvas.addEventListener('pointerdown',e=>{this.dragged=true;this.lastX=e.clientX;this.lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.dragged)return;this.angle+=(e.clientX-this.lastX)*0.008;this.pitch=Math.max(-.3,Math.min(.65,this.pitch+(e.clientY-this.lastY)*0.006));this.lastX=e.clientX;this.lastY=e.clientY;this.draw();});
  canvas.addEventListener('pointerup',()=>{this.dragged=false;});
  canvas.addEventListener('pointercancel',()=>{this.dragged=false;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.min(2.5,Math.max(.45,this.zoom*Math.exp(-e.deltaY*.001)));this.draw();},{passive:false});
  window.addEventListener('resize',()=>this.draw());
 }
 set(model,data){this.model=model;this.data=data;this.draw();}
 project([x,y,z],width,height,scale,refH){
  const cos=Math.cos(this.angle), sin=Math.sin(this.angle);
  const cx=x*cos-z*sin, cz=x*sin+z*cos;
  const cp=Math.cos(this.pitch), sp=Math.sin(this.pitch);
  const cy=(y-refH)*cp-cz*sp, depth=(y-refH)*sp+cz*cp;
  const distortion=Math.max(.57,1-depth/(Math.max(width,height)/2+8));
  return [width/2+cx*scale/distortion, height*.56-cy*scale/distortion,depth];
 }
 draw(){
  if(!this.ctx || !this.model || !this.data)return;
  const {canvas,ctx,model,data}=this;const box=canvas.getBoundingClientRect();if(box.width===0||box.height===0)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.floor(box.width*dpr),h=Math.floor(box.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(dpr,0,0,dpr,0,0); const W=box.width,H=box.height;
  const background=ctx.createLinearGradient(0,0,0,H);background.addColorStop(0,'#eaf1f7');background.addColorStop(1,'#f6f8fa');ctx.fillStyle=background;ctx.fillRect(0,0,W,H);
  const dim=model.inputs.dimensions;
  const isBackdrop=model.type==='backdrop';
  const span=(isBackdrop?dim.backdropWidth:dim.spanDistance*dim.numberOfSwags)/100;
  const height=(isBackdrop?dim.backdropHeight:Math.max(260,dim.sagDepth+160))/100;
  const scale=Math.min(W/(Math.max(5,span)*1.45),H/(Math.max(3.2,height)*1.4))*this.zoom;
  const refH=height/2;
  const p=pt=>this.project(pt,W,H,scale,refH);
  // Architectural floor grid with perspective projection.
  ctx.lineWidth=.7;ctx.strokeStyle='#d4dee8';ctx.globalAlpha=.74;
  for(let i=-10;i<=10;i++){this.stroke(ctx,p([i*.5,0,-3]),p([i*.5,0,3]));this.stroke(ctx,p([-5,0,i*.3]),p([5,0,i*.3]));}
  ctx.globalAlpha=1;
  const fabricRgb=this.parseHex(model.sceneParams.color);
  const mesh=[];
  const addSurface=(grid,nx,ny)=>{
   for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const a=grid[j*(nx+1)+i],b=grid[j*(nx+1)+i+1],c=grid[(j+1)*(nx+1)+i],d=grid[(j+1)*(nx+1)+i+1];
    mesh.push([a,c,b]);mesh.push([b,c,d]);
   }
  };
  if(isBackdrop){
    const panels=Math.min(data.result.panelCount,90);const width=span/panels;const amp=width*.14*Math.min(2.2,Math.max(.3,model.inputs.fullnessRatio/2));
    const X=18,Y=34;
    for(let panel=0;panel<panels;panel++){
      const grid=[];
      for(let j=0;j<=Y;j++)for(let i=0;i<=X;i++){
       const u=i/X,v=j/Y;
       grid.push([-span/2+width*(panel+u),height*v,.035+amp*Math.sin(u*7*Math.PI)*(0.14+.86*(1-v)**.7)]);
      }
      addSurface(grid,X,Y);
    }
  }else{
    const count=dim.numberOfSwags,X=48,Y=14,spread=model.inputs.fabricWidth/100;
    const top=height-.10;
    const catenary=solveCatenary(dim.spanDistance,dim.sagDepth);
    const edgeCosh=dim.sagDepth===0?0:Math.cosh((dim.spanDistance/2)/catenary.a);
    for(let n=0;n<count;n++){
      const grid=[];
      for(let j=0;j<=Y;j++)for(let i=0;i<=X;i++){
        const u=i/X,v=j/Y;
        grid.push([-span/2+(n+u)*dim.spanDistance/100,top+(dim.sagDepth===0?0:catenary.a*(Math.cosh((u-.5)*dim.spanDistance/catenary.a)-edgeCosh)/100) + .05*Math.sin(v*18*Math.PI)*Math.sin(u*Math.PI), (v-.5)*spread]);
      }
      addSurface(grid,X,Y);
    }
  }
  const shaded=[];
  for(const tri of mesh){
   const a=p(tri[0]),b=p(tri[1]),c=p(tri[2]);
   const ax=tri[1][0]-tri[0][0],ay=tri[1][1]-tri[0][1],az=tri[1][2]-tri[0][2];
   const bx=tri[2][0]-tri[0][0],by=tri[2][1]-tri[0][1],bz=tri[2][2]-tri[0][2];
   const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;const n=Math.hypot(nx,ny,nz)||1;
   const lambert=Math.abs((nx*.5+ny*.72+nz*.47)/n);
   const tone=.70+lambert*.34;
   const rgb=fabricRgb.map(v=>Math.max(0,Math.min(255,Math.round(v*tone))));
   shaded.push({a,b,c,depth:(a[2]+b[2]+c[2])/3,fill:`rgb(${rgb.join(',')})`});
  }
  shaded.sort((a,b)=>a.depth-b.depth);
  ctx.lineWidth=.4;
  for(const f of shaded){ctx.fillStyle=f.fill;ctx.strokeStyle=f.fill;ctx.beginPath();ctx.moveTo(f.a[0],f.a[1]);ctx.lineTo(f.b[0],f.b[1]);ctx.lineTo(f.c[0],f.c[1]);ctx.closePath();ctx.fill();ctx.stroke();}
  const drawBar=(a,b,color='#a3b0bd',line=4)=>{const A=p(a),B=p(b);ctx.lineCap='round';ctx.lineWidth=line;ctx.strokeStyle=color;this.stroke(ctx,A,B);};
  if(isBackdrop){drawBar([-span/2-.08,height+.07,0],[span/2+.08,height+.07,0]);drawBar([-span/2-.08,0,0],[-span/2-.08,height+.07,0],'#c5ccd5',2);drawBar([span/2+.08,0,0],[span/2+.08,height+.07,0],'#c5ccd5',2);}
  else{
   const top=height-.10,one=dim.spanDistance/100;
   for(let i=0;i<=dim.numberOfSwags;i++){
    const x=-span/2+i*one;drawBar([x,0,0],[x,top,0],'#a6b2bc',2);drawBar([x,top,-model.inputs.fabricWidth/200-.10],[x,top,model.inputs.fabricWidth/200+.10],'#a6b2bc',2.5);
   }
  }
 }
 stroke(ctx,a,b){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
 parseHex(s){const t=s.replace('#','');return [0,2,4].map(p=>parseInt(t.slice(p,p+2),16));}
}
