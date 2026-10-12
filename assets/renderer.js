import { solveCatenary } from './engine.js';

const rgb=color=>{const hex=/^#[0-9a-f]{6}$/i.test(color)?color:'#a4bed6';return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));};
export class LayeredRenderer {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.angle=0.17;this.pitch=0.10;this.zoom=1;
    this.projectData=null;this.dragging=false;
    canvas.addEventListener('pointerdown',e=>{this.dragging=true;this.lx=e.clientX;this.ly=e.clientY;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!this.dragging)return;this.angle=Math.max(-.7,Math.min(.7,this.angle+(e.clientX-this.lx)*.006));this.pitch=Math.max(-.28,Math.min(.52,this.pitch+(e.clientY-this.ly)*.004));this.lx=e.clientX;this.ly=e.clientY;this.draw();});
    canvas.addEventListener('pointerup',()=>{this.dragging=false;});canvas.addEventListener('pointercancel',()=>{this.dragging=false;});
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.55,Math.min(2.8,this.zoom*Math.exp(-e.deltaY*.001)));this.draw();},{passive:false});
    window.addEventListener('resize',()=>this.draw());
  }
  set(project){this.projectData=project;this.draw();}
  resetCamera(){this.angle=.17;this.pitch=.1;this.zoom=1;this.draw();}
  project([x,y,z],W,H,scale,centerH){
    const co=Math.cos(this.angle),si=Math.sin(this.angle),cx=x*co-z*si,cz=x*si+z*co;
    const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch),cy=(y-centerH)*cp-cz*sp,dep=(y-centerH)*sp+cz*cp;
    const distortion=Math.max(.67,Math.min(1.6,1-dep*.028));
    return [W/2+cx*scale/distortion,H*.57-cy*scale/distortion,dep];
  }
  draw(){
    const {canvas,ctx,projectData:project}=this;if(!ctx||!project)return;
    const bounds=canvas.getBoundingClientRect();if(bounds.width<20||bounds.height<20)return;
    const dpr=Math.min(2,window.devicePixelRatio||1),W=bounds.width,H=bounds.height;
    const pixelW=Math.round(W*dpr),pixelH=Math.round(H*dpr);
    if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#e9f0f7');bg.addColorStop(.64,'#f4f7fb');bg.addColorStop(1,'#fff');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const visible=project.layers.filter(l=>l.visible!==false);if(!visible.length)return;
    const backdrop=project.type==='backdrop';
    const extents=visible.map(l=>backdrop?[(Number(l.widthCm)+Math.abs(Number(l.xOffsetCm))*2)/100,Number(l.heightCm)/100]:
      [(Number(l.spanCm)*Number(l.swags)+Math.abs(Number(l.xOffsetCm))*2)/100,Math.max(270,Number(l.sagCm)+180)/100]);
    const maxW=Math.max(4,...extents.map(a=>a[0]));const maxH=Math.max(2.5,...extents.map(a=>a[1]));
    const scale=Math.min(W/(maxW*1.45),H/(maxH*1.58))*this.zoom;
    const P=pt=>this.project(pt,W,H,scale,maxH/2);
    ctx.lineWidth=.7;ctx.strokeStyle='#cfdce8';ctx.globalAlpha=.66;
    for(let i=-11;i<=11;i++){this.stroke(ctx,P([i*.5,0,-4]),P([i*.5,0,4]));this.stroke(ctx,P([-6,0,i*.4]),P([6,0,i*.4]));}
    ctx.globalAlpha=1;
    // Back-to-front canvas painter's algorithm: each drape mesh has its own independent material.
    for(let li=0;li<visible.length;li++){
      const l=visible[li],z=(Number(l.depthCm)||0)/100+li*.015,
        xShift=(Number(l.xOffsetCm)||0)/100,color=rgb(l.color),opacity=Math.max(.05,Math.min(1,(Number(l.opacity)||100)/100));
      const triangles=[];
      const surface=(grid,nx,ny)=>{
        for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
          const a=grid[y*(nx+1)+x],b=grid[y*(nx+1)+x+1],c=grid[(y+1)*(nx+1)+x],d=grid[(y+1)*(nx+1)+x+1];
          triangles.push([a,c,b],[b,c,d]);
        }
      };
      let width,top;
      if(backdrop){
        width=l.widthCm/100;const height=l.heightCm/100;top=height;
        const panels=Math.min(28,Math.max(1,Math.ceil(l.widthCm*l.fullness/l.fabricWidth)));
        const pw=width/panels;
        for(let j=0;j<panels;j++){
          const nx=10,ny=25,grid=[];
          for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){
            const u=ix/nx,v=iy/ny,fold=Math.sin(u*Math.PI*5+.3)*pw*.22*Math.min(2.4,l.fullness)/2;
            grid.push([xShift-width/2+pw*(j+u),height*v,z+fold*(.18+.82*(1-v)**.72)]);
          }
          surface(grid,nx,ny);
        }
      } else {
        const span=l.spanCm/100,swags=Math.min(24,l.swags),sag=l.sagCm/100;
        width=span*swags;top=Math.max(maxH-.30,sag+.65);
        const cat=solveCatenary(l.spanCm,l.sagCm),edge=Math.cosh(cat.t);
        for(let j=0;j<swags;j++){
          const nx=44,ny=9,grid=[];
          for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){
            const u=ix/nx,v=iy/ny,drop=l.sagCm===0?0:cat.a*(Math.cosh((u-.5)*l.spanCm/cat.a)-edge)/100;
            grid.push([xShift-width/2+(j+u)*span,top+drop+.045*Math.sin(v*10*Math.PI)*Math.sin(u*Math.PI),z+(v-.5)*l.fabricWidth/100]);
          }
          surface(grid,nx,ny);
        }
      }
      const faces=[];
      for(const t of triangles){
        const [a,b,c]=t.map(P),u=t[1].map((n,i)=>n-t[0][i]),v=t[2].map((n,i)=>n-t[0][i]);
        const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],mag=Math.hypot(...normal)||1;
        const diff=Math.abs((normal[0]*.37+normal[1]*.68+normal[2]*.74)/mag),tone=.67+diff*.43;
        faces.push({a,b,c,dep:(a[2]+b[2]+c[2])/3,fill:`rgb(${color.map(n=>Math.round(Math.min(255,n*tone))).join(',')})`});
      }
      faces.sort((a,b)=>a.dep-b.dep);
      ctx.globalAlpha=opacity;ctx.lineWidth=.35;
      for(const f of faces){ctx.fillStyle=f.fill;ctx.strokeStyle=f.fill;ctx.beginPath();ctx.moveTo(f.a[0],f.a[1]);ctx.lineTo(f.b[0],f.b[1]);ctx.lineTo(f.c[0],f.c[1]);ctx.closePath();ctx.fill();ctx.stroke();}
      ctx.globalAlpha=1;
      if(li===0){
        ctx.strokeStyle='#9dabb9';ctx.lineWidth=3;ctx.lineCap='round';
        this.stroke(ctx,P([xShift-width/2-.08,top+.075,z-.06]),P([xShift+width/2+.08,top+.075,z-.06]));
        if(backdrop){ctx.strokeStyle='#b0bdc8';ctx.lineWidth=2;this.stroke(ctx,P([xShift-width/2-.08,0,z-.06]),P([xShift-width/2-.08,top+.075,z-.06]));this.stroke(ctx,P([xShift+width/2+.08,0,z-.06]),P([xShift+width/2+.08,top+.075,z-.06]));}
      }
    }
  }
  stroke(ctx,a,b){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
}
