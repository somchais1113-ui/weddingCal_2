/** Normalized image points; scene coordinates in centimetres. No depth inference. */
export function solveLinear(a,b){
 const n=b.length,m=a.map((r,i)=>[...r,b[i]]);
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;
  if(Math.abs(m[p][k])<1e-11)throw new Error('จุดอ้างอิงซ้ำหรือเกือบอยู่บนเส้นเดียวกัน');
  [m[p],m[k]]=[m[k],m[p]];const d=m[k][k];for(let j=k;j<=n;j++)m[k][j]/=d;
  for(let i=0;i<n;i++)if(i!==k){const f=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=f*m[k][j];}
 }return m.map(r=>r[n]);
}
export function validateQuad(q){
 if(!Array.isArray(q)||q.length!==4||q.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('ต้องมีจุดอ้างอิง 4 มุม');
 const signs=q.map((a,i)=>{const b=q[(i+1)%4],c=q[(i+2)%4];return (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);});
 if(signs.some(s=>s<1e-5))throw new Error('เลือกมุมตามลำดับ ซ้ายบน → ขวาบน → ขวาล่าง → ซ้ายล่าง โดยไม่ไขว้กัน');
}
export function homography(src,dst){
 const a=[],b=[];
 src.forEach((p,i)=>{const q=dst[i],x=p.x,y=p.y,u=q.x,v=q.y;a.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);b.push(u,v);});
 return [...solveLinear(a,b),1];
}
export function transform(h,p){const d=h[6]*p.x+h[7]*p.y+h[8];if(Math.abs(d)<1e-9)throw new Error('จุดนี้อยู่นอกระนาบที่ปรับมุมได้');return {x:(h[0]*p.x+h[1]*p.y+h[2])/d,y:(h[3]*p.x+h[4]*p.y+h[5])/d};}
export function calibration(quad,width,height){
 validateQuad(quad);if(!(width>0&&height>0))throw new Error('ขนาดฉากต้องมากกว่าศูนย์');
 const rect=[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
 return {forward:homography(quad,rect),inverse:homography(rect,quad)};
}
export function rectifyImage(image,quad,width,height,maxPixels=1100){
 const {inverse}=calibration(quad,width,height),canvas=document.createElement('canvas');
 const ratio=Math.min(maxPixels/width,maxPixels/height);canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
 const src=document.createElement('canvas');src.width=image.naturalWidth||image.width;src.height=image.naturalHeight||image.height;
 const sc=src.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0);const input=sc.getImageData(0,0,src.width,src.height).data;
 const ctx=canvas.getContext('2d'),out=ctx.createImageData(canvas.width,canvas.height);
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const p=transform(inverse,{x:(x+.5)/canvas.width*width,y:(y+.5)/canvas.height*height}),sx=p.x*(src.width-1),sy=p.y*(src.height-1),i=(y*canvas.width+x)*4;
  if(sx<0||sy<0||sx>src.width-1||sy>src.height-1)continue;
  const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(x0+1,src.width-1),y1=Math.min(y0+1,src.height-1),fx=sx-x0,fy=sy-y0;
  for(let c=0;c<4;c++)out.data[i+c]=input[(y0*src.width+x0)*4+c]*(1-fx)*(1-fy)+input[(y0*src.width+x1)*4+c]*fx*(1-fy)+input[(y1*src.width+x0)*4+c]*(1-fx)*fy+input[(y1*src.width+x1)*4+c]*fx*fy;
 }ctx.putImageData(out,0,0);return canvas;
}
